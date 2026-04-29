(function () {
  const CONFIG = {
    bridge: "/api/bridge.php?",
    serverRoot: "/api/root",
    shareImage: "/api/static/kousuan_v1/image/24share.jpg",
  };

  const GRADE_TITLES = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];
  const TYPE_TITLES = [
    "整数加减运算",
    "整数乘除运算",
    "小数加减运算",
    "小数乘除运算",
    "分数加减运算",
    "分数乘除运算",
    "百分数运算",
    "因数与倍数",
    "单位换算练习",
    "解方程",
  ];
  const PRINT_STYLE_LABELS = ["直接写得数", "填空题", "竖式列式", "竖式留白"];

  const state = {
    route: parseRoute(),
    version: null,
    loading: false,
    routeError: "",
    auth: {
      user: null,
      checked: false,
      mode: "login",
      form: { username: "", password: "" },
      error: "",
    },
    homeStats: { localStars: [], nickname: "" },
    practiceSelect: {
      selectById: Number(localStorage.getItem("selectById") || 1),
      selectedId: Number(localStorage.getItem("selectedId") || 0),
      timulist: [],
      starsMap: getLocal("local_stars", []),
    },
    practiceSession: null,
    practiceResult: null,
    printSelect: {
      selectById: Number(localStorage.getItem("printSelectById") || 1),
      selectedId: Number(localStorage.getItem("printSelectedId") || 0),
      timulist: [],
      pageList: getLocal("pageList", []),
    },
    printPreview: null,
    twentyfour: null,
    twentyfourPreview: null,
    articleUrl: "",
    feedback: { question: "", message: "", contact: "" },
    notification: "",
  };

  const app = document.getElementById("app");

  window.addEventListener("hashchange", async () => {
    state.route = parseRoute();
    await bootstrapRoute();
  });

  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);

  bootstrapRoute();

  async function bootstrapRoute() {
    if (window.location.protocol === "file:") {
      state.loading = false;
      state.routeError = "当前页面是通过 file:// 直接打开的。必须先启动本地服务，再用 http://127.0.0.1:8080 访问，不能直接双击 index.html。";
      render();
      return;
    }

    state.loading = true;
    state.routeError = "";
    state.practiceSession = null;
    state.practiceResult = null;
    state.printPreview = null;
    state.twentyfour = null;
    state.twentyfourPreview = null;
    render();

    state.homeStats.localStars = getLocal("local_stars", []);
    state.homeStats.nickname = localStorage.getItem("nickname") || "";
    await ensureAuth();
    if (!state.auth.user && state.route.name !== "login") {
      routeTo("login");
      return;
    }
    try {
      if (!state.version) {
        state.version = await getVersion();
      }
    } catch (error) {
      notify("版本信息加载失败，接口可能有跨域限制。");
    }

    try {
      if (state.route.name === "practice-select") {
        await loadPracticeList();
      }
      if (state.route.name === "print-select") {
        await loadPrintList();
      }
      if (state.route.name === "practice-run") {
        await initPracticeSession();
      }
      if (state.route.name === "practice-result") {
        initPracticeResult();
      }
      if (state.route.name === "print-preview") {
        await initPrintPreview();
      }
      if (state.route.name === "twentyfour") {
        await initTwentyfour();
      }
      if (state.route.name === "twentyfour-preview") {
        initTwentyfourPreview();
      }
      if (state.route.name === "article") {
        state.articleUrl = decodeURIComponent(state.route.params.url || "");
      }
      if (state.route.name === "feedback") {
        state.feedback.question = decodeURIComponent(state.route.params.question || "");
      }
    } catch (error) {
      state.routeError = buildRouteErrorMessage(error);
      console.error(error);
    } finally {
      state.loading = false;
    }
    render();
  }

  function parseRoute() {
    const hash = window.location.hash || "#/";
    const [pathPart, queryString = ""] = hash.slice(1).split("?");
    const params = Object.fromEntries(new URLSearchParams(queryString).entries());
    const name = pathPart === "/" ? "home" : pathPart.replace(/^\//, "");
    return { name, params };
  }

  function routeTo(name, params = {}) {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `/${name}${query ? `?${query}` : ""}`;
  }

  async function api(functionName, extra = {}) {
    const params = new URLSearchParams({ function: functionName, ...extra });
    const url = `${CONFIG.bridge}${params.toString()}`;
    let response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(`请求失败: ${functionName}。这通常是接口不可达，或浏览器阻止了跨域请求。接口: ${url}`);
    }
    if (!response.ok) {
      throw new Error(`请求失败: ${functionName}，HTTP ${response.status}。接口: ${url}`);
    }
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`接口返回不是有效 JSON: ${functionName}。接口: ${url}`);
    }
  }

  async function getVersion() {
    const data = await api("getversion");
    return data.data || [];
  }

  async function loadPracticeList() {
    const selectById = state.practiceSelect.selectById;
    const selectedId = state.practiceSelect.selectedId;
    const key = selectById === 1 ? `tikubygrade${selectedId + 1}` : `tikubydlid${selectedId + 1}`;
    const cached = getLocal(key, null);
    if (cached) {
      state.practiceSelect.timulist = cached;
      return;
    }
    const functionName = selectById === 1 ? "gettikubynianji" : "gettikubydlid";
    const argName = selectById === 1 ? "nianji" : "dlid";
    const data = await api(functionName, { [argName]: String(selectedId + 1) });
    state.practiceSelect.timulist = data.data || [];
    setLocal(key, state.practiceSelect.timulist);
  }

  async function loadPrintList() {
    const selectById = state.printSelect.selectById;
    const selectedId = state.printSelect.selectedId;
    const key = selectById === 1 ? `tikubygrade${selectedId + 1}` : `tikubydlid${selectedId + 1}`;
    const cached = getLocal(key, null);
    if (cached) {
      state.printSelect.timulist = cached;
    } else {
      const functionName = selectById === 1 ? "gettikubynianji" : "gettikubydlid";
      const argName = selectById === 1 ? "nianji" : "dlid";
      const data = await api(functionName, { [argName]: String(selectedId + 1) });
      state.printSelect.timulist = data.data || [];
      setLocal(key, state.printSelect.timulist);
    }

    if (!state.printSelect.pageList.length) {
      const data = await api("getpagetimunum");
      state.printSelect.pageList = data.data || [];
      setLocal("pageList", state.printSelect.pageList);
    }
  }

  async function initPracticeSession() {
    const tiku = parseJsonParam(state.route.params.tiku);
    if (!tiku) {
      routeTo("practice-select");
      return;
    }

    const docid = Number(state.route.params.docid || -1);
    const session = {
      tiku,
      docId: docid,
      currentIndex: 0,
      totalRight: 0,
      wrongNums: 0,
      wrongTimuSet: [],
      stage: "normal",
      isHelped: false,
      candidateAnswer: "",
      currentAnswerObj: null,
      currentTimuObj: null,
      timuObj: [],
      totalTimuNum: 10,
      flash: "",
      flashType: "",
      startedAt: Date.now(),
    };

    let payload;
    if (docid === -1) {
      payload = await api("createdoc", { xlid: String(tiku.xlid), totalcount: "10" });
    } else {
      payload = await api("getdoc", { docid: String(docid) });
    }

    let timus = (payload.data && payload.data.timus) || [];
    if (timus.length > 10) timus = timus.slice(0, 10);
    timus = setTimuStyle(tiku.xlid, timus, tiku.page || "");

    session.timuObj = timus;
    session.totalTimuNum = timus.length;
    session.docId = payload.data.docId;
    state.practiceSession = session;
    loadPracticeQuestion();
  }

  function loadPracticeQuestion() {
    const session = state.practiceSession;
    const source =
      session.stage === "fix" && session.wrongTimuSet.length
        ? session.wrongTimuSet[session.wrongTimuSet.length - 1]
        : session.timuObj[session.currentIndex];
    if (!source) return;
    session.currentTimuObj = {
      timu: source.timu,
      daan: source.daan,
      realAnswer: source.realAnswer || source.daan,
    };
    session.currentAnswerObj = { realAnswer: source.daan, inputAnswer: "" };
    session.candidateAnswer = "";
    session.flash = "";
    session.flashType = "";
  }

  function initPracticeResult() {
    const tiku = parseJsonParam(state.route.params.tiku);
    if (!tiku) return;
    const score = Number(state.route.params.score || 0);
    const timecost = Number(state.route.params.timecost || 0);
    const wrongNums = Number(state.route.params.wrongnums || 0);
    const stars = score2stars(fuFenZhi(score));
    updateLocalStars(tiku.xlid, stars);
    state.practiceResult = {
      tiku,
      score,
      scoreDisplay: `${Math.round(fuFenZhi(score))}%`,
      stars,
      timecost: (timecost / 1000).toFixed(1),
      wrongNums,
      nickname: localStorage.getItem("nickname") || "",
    };
  }

  async function initPrintPreview() {
    const tiku = parseJsonParam(state.route.params.tiku);
    if (!tiku) {
      routeTo("print-select");
      return;
    }

    const docId = Number(state.route.params.docid || -1);
    const printCount = Number(state.route.params.printcount || 20);
    const byid = Number(state.route.params.byid || 2);
    const pagenum = Number(state.route.params.pagenum || -1);
    const flagFenshu = (tiku.page || "").includes("fenshu") || Number(tiku.xlid) === 90;

    const preview = {
      tiku,
      docId,
      lastDocId: -1,
      printCount,
      printStyleId: [20, 22, 142, 143, 148].includes(Number(tiku.xlid)) ? 2 : 1,
      timus: [],
      fillTimus: [],
      shushiTimus: [],
      arrFenshu: [],
      flagFenshu,
      settings: {
        docTitle: getTikuName(tiku),
        nameLabel: "姓名",
        scoreLabel: "得分",
        jinju: "口算天天练，进步看得见",
        reportCol: 4,
        fillCol: 3,
        verticalCol: 3,
        timuSize: 28,
        fillTimuSize: 28,
      },
      tiliangById: byid,
      pagenum,
      metadata: {},
    };

    const key = `printviewbyxlid${tiku.xlid}`;
    const cached = getLocal(key, null);
    let printSet = cached;
    if (!printSet) {
      const data = await api("getprintviewbyxlid", { xlid: String(tiku.xlid) });
      printSet = data.data;
      if (printSet) {
        setLocal(key, printSet);
      }
    }

    printSet = printSet || {};

    preview.settings = {
      ...preview.settings,
      docTitle: printSet && printSet.xlname ? printSet.xlname : getTikuName(tiku),
      reportCol: Number(printSet.reportCol || 4),
      fillCol: Number(printSet.fillCol || 3),
      verticalCol: Number(printSet.verticalCol || 3),
      timuSize: Number(printSet.xiedeshuFontsize || 28),
      fillTimuSize: Number(printSet.fillFontsize || 28),
    };
    preview.metadata = {
      xiedeshu_page1: Number(printSet.xiedeshuPage1 || 10),
      xiedeshu_page2: Number(printSet.xiedeshuPage2 || 10),
      fill_page1: Number(printSet.fillPage1 || 10),
      fill_page2: Number(printSet.fillPage2 || 10),
      lieshi_page1: Number(printSet.lieshiPage1 || 10),
      lieshi_page2: Number(printSet.lieshiPage2 || 10),
      liubai_page1: Number(printSet.liubaiPage1 || 10),
      liubai_page2: Number(printSet.liubaiPage2 || 10),
      printStyle: printSet.printStyle || "1|1|1|1",
    };

    let payload;
    if (docId === -1) {
      payload = await api("createdoc", {
        xlid: String(tiku.xlid),
        totalcount: String(printCount),
      });
    } else {
      payload = await api("getdoc", { docid: String(docId) });
    }

    preview.docId = payload.data.docId;
    preview.timus = payload.data.timus || [];
    preview.printCount = preview.timus.length;
    state.printPreview = preview;
    rebuildPrintPreview();
  }

  function rebuildPrintPreview() {
    const preview = state.printPreview;
    const xlid = Number(preview.tiku.xlid);
    const timus = preview.timus.map((item) => ({ ...item }));
    preview.arrFenshu = [];
    preview.fillTimus = [];
    preview.shushiTimus = [];

    if (preview.flagFenshu) {
      preview.arrFenshu = timus.map((item) => buildFenshuExpre(item.timu, 1));
    } else if (preview.printStyleId === 1) {
      preview.timus = setSpecialTimuStyle4Printview(xlid, timus);
    } else if (preview.printStyleId === 2) {
      preview.fillTimus = [20, 22, 142, 143, 148].includes(xlid)
        ? setSpecialFillTimuStyle4Printview(xlid, timus)
        : batchSwitchToFillTimu(timus, preview.settings.fillCol, getOperatorNum(timus[0]?.timu || "") + 1);
    } else if (preview.printStyleId === 3 || preview.printStyleId === 4) {
      preview.shushiTimus = batchSwitchToShushiTimu(timus);
    }
  }

  async function initTwentyfour() {
    const existing = state.twentyfour;
    if (existing && existing.sourceKey === JSON.stringify(state.route.params)) {
      return;
    }

    const payload = await api("get24diantiku", {
      mode: state.route.params.mode || "1",
      small_rate: state.route.params.small_rate || "10",
      big_rate: state.route.params.big_rate || "20",
      itemid: state.route.params.itemid || "1",
      timuid: state.route.params.timuid || "-1",
      count: state.route.params.count || "5",
    });

    const timuObjectArr = deal24Data(payload.data || []);
    state.twentyfour = {
      sourceKey: JSON.stringify(state.route.params),
      mode: Number(state.route.params.mode || 1),
      itemid: Number(state.route.params.itemid || 1),
      currentProgress: 0,
      totalTimuNum: timuObjectArr.length,
      timuObjectArr,
      currentTimuPageObject: [],
      currentTimuObject: null,
      operatorStatus: ["", "", "", ""],
      selectedOperator: -1,
      ishelp: 0,
      loadTime: Date.now(),
      scoreArr: [],
      timecostArr: [],
      helpText: "",
      completed: false,
    };
    setTwentyfourTimu();
  }

  function setTwentyfourTimu() {
    const game = state.twentyfour;
    const current = game.timuObjectArr[game.currentProgress];
    game.currentTimuObject = current;
    game.currentTimuPageObject = current.nums.map((value, index) => ({
      visibility: "visible",
      selected: "",
      value,
      disp: value,
      timuid: current.timuid,
      index,
      fontsize: 4,
    }));
    game.selectedOperator = -1;
    game.operatorStatus = ["", "", "", ""];
    game.ishelp = 0;
    game.helpText = "";
    game.loadTime = Date.now();
  }

  function render() {
    app.innerHTML = `
      <div class="app-shell">
        ${renderTopbar()}
        ${state.notification ? `<div class="card" style="margin-bottom:16px">${escapeHtml(state.notification)}</div>` : ""}
        ${state.loading ? `<div class="card" style="margin-bottom:16px">正在加载...</div>` : ""}
        ${state.routeError ? renderRouteError() : ""}
        ${state.routeError ? "" : renderRoute()}
      </div>
    `;
    postRender();
  }

  function postRender() {
    if (state.route.name !== "twentyfour" || state.routeError || !state.twentyfour) {
      return;
    }
    const target =
      app.querySelector(".twentyfour-board .actions") ||
      app.querySelector(".result-score")?.closest(".card")?.querySelector(".actions");
    if (!target) return;
    if (target.querySelector('[data-twentyfour-action="print-online"]')) return;
    const printButton = document.createElement("button");
    printButton.className = "btn";
    printButton.dataset.twentyfourAction = "print-online";
    printButton.textContent = "在线打印";
    target.appendChild(printButton);
    const pdfButton = document.createElement("button");
    pdfButton.className = "btn";
    pdfButton.dataset.twentyfourAction = "save-pdf";
    pdfButton.textContent = "保存PDF";
    target.appendChild(pdfButton);
  }

  function renderRouteError() {
    return `
      <section class="card" style="margin-bottom:16px">
        <h3>加载失败</h3>
      </section>
    `;
  }

  function renderTopbar() {
    const route = state.route.name;
    return `
      <div class="topbar no-print">
        <div class="brand">
          <h1>口算天天练</h1>
        </div>
        <div class="nav">
          ${state.auth.user ? `<span class="chip active">${escapeHtml(state.auth.user.username)}</span>` : ""}
          ${navButton("home", "首页", route === "home")}
          ${navButton("practice-select", "在线口算", route.startsWith("practice"))}
          ${navButton("print-select", "打印练习", route.startsWith("print"))}
          ${navButton("twentyfour", "24 点", route === "twentyfour", {
            mode: 1,
            small_rate: 10,
            big_rate: 20,
            itemid: 1,
            timuid: -1,
            count: 5,
          })}
          ${state.auth.user ? `<button data-auth-action="logout">退出</button>` : ""}
        </div>
      </div>
    `;
  }

  function navButton(name, label, active, params) {
    return `<button class="${active ? "active" : ""}" data-nav="${name}" data-params='${escapeAttr(
      JSON.stringify(params || {})
    )}'>${label}</button>`;
  }

  function renderRoute() {
    switch (state.route.name) {
      case "practice-select":
        return renderPracticeSelect();
      case "practice-run":
        return renderPracticeRun();
      case "practice-result":
        return renderPracticeResult();
      case "print-select":
        return renderPrintSelect();
      case "print-preview":
        return renderPrintPreview();
      case "twentyfour":
        return renderTwentyfour();
      case "twentyfour-preview":
        return renderTwentyfourPreview();
      case "login":
        return renderLogin();
      case "article":
        return renderArticle();
      case "feedback":
        return renderFeedback();
      default:
        return renderHome();
    }
  }

  function renderHome() {
    const stars = state.homeStats.localStars.reduce((sum, item) => sum + Number(item.stars || 0), 0);
    return `
      <div class="hero">
        <section class="hero-banner">
          <div class="kpis">
            <div class="kpi">
              <strong>${state.homeStats.localStars.length}</strong>
              <span>本地已记录题型</span>
            </div>
            <div class="kpi">
              <strong>${stars}</strong>
              <span>累计星级</span>
            </div>
            <div class="kpi">
              <strong>${state.version ? state.version.length : 0}</strong>
              <span>版本项</span>
            </div>
            <div class="kpi">
              <strong>${escapeHtml(state.homeStats.nickname || "未设置")}</strong>
              <span>奖状昵称</span>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="section-head">
            <h2>入口</h2>
          </div>
          <div class="grid cards">
            ${homeCard("在线口算", "按年级或题型拉取题库，进入答题、错题重做和结果页。", "practice-select")}
            ${homeCard("打印练习", "题量、版式、页面文案可调整，并支持浏览器打印。", "print-select")}
            ${homeCard("24 点", "保留原始四数运算玩法和提示答案。", "twentyfour", {
              mode: 1,
              small_rate: 10,
              big_rate: 20,
              itemid: 1,
              timuid: -1,
              count: 5,
            })}
          </div>
        </section>
      </div>
    `;
  }

  function homeCard(title, text, nav, params = {}) {
    return `
      <article class="card">
        <h3>${title}</h3>
        <p class="muted">${text}</p>
        <div class="actions">
          <button class="btn primary" data-nav="${nav}" data-params='${escapeAttr(JSON.stringify(params))}'>进入</button>
        </div>
      </article>
    `;
  }

  function renderLogin() {
    const mode = state.auth.mode;
    return `
      <section class="card" style="max-width:480px;margin:40px auto">
        <div class="section-head">
          <h2>${mode === "login" ? "登录" : "注册"}</h2>
        </div>
        <div class="stack">
          <label>账号
            <input data-auth-field="username" value="${escapeAttr(state.auth.form.username)}" placeholder="字母/数字/下划线" />
          </label>
          <label>密码
            <input type="password" data-auth-field="password" value="${escapeAttr(state.auth.form.password)}" placeholder="至少6位" />
          </label>
          ${state.auth.error ? `<div class="tip" style="color:#d84b5d">${escapeHtml(state.auth.error)}</div>` : ""}
          <div class="actions">
            <button class="btn primary" data-auth-action="${mode}">${mode === "login" ? "登录" : "注册并登录"}</button>
            <button class="btn" data-auth-action="switch-mode">${mode === "login" ? "没有账号，去注册" : "已有账号，去登录"}</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderPracticeSelect() {
    const model = state.practiceSelect;
    const titles = model.selectById === 1 ? GRADE_TITLES : TYPE_TITLES;
    return `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>在线口算</h2>
            <p class="muted">选择年级或题型后进入原小程序对应的做题流程。</p>
          </div>
        </div>
        <div class="toolbar">
          <button class="chip ${model.selectById === 1 ? "active" : ""}" data-practice-tab="1">按年级</button>
          <button class="chip ${model.selectById === 2 ? "active" : ""}" data-practice-tab="2">按题型</button>
        </div>
        <div class="chips">
          ${titles
            .map(
              (title, index) => `
                <button class="chip ${index === model.selectedId ? "active" : ""}" data-practice-filter="${index}">
                  ${title}
                </button>
              `
            )
            .join("")}
        </div>
      </section>
      <section class="card" style="margin-top:18px">
        <div class="section-head">
          <h3>题库列表</h3>
          <span class="muted">${model.timulist.length} 个题型</span>
        </div>
        <div class="list">
          ${model.timulist
            .map((item) => {
              const stars = getStarsFromLocal(item.xlid);
              return `
                <div class="list-item">
                  <div>
                    <strong>${escapeHtml(getTikuName(item))}</strong>
                    <div class="stars">${"★".repeat(stars)}${"☆".repeat(Math.max(0, 5 - stars))}</div>
                  </div>
                  <div class="actions">
                    <button class="btn primary" data-start-practice='${escapeAttr(JSON.stringify(normalizeTiku(item)))}'>开始</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderPracticeRun() {
    if (state.routeError) {
      return `<section class="card"><p>口算练习未能加载。</p></section>`;
    }
    const session = state.practiceSession;
    if (!session) {
      return `<section class="card"><p>正在加载题目...</p></section>`;
    }
    const progress = Math.min(100, Math.round((session.totalRight / Math.max(session.totalTimuNum, 1)) * 100));
    return `
      <div class="practice-stage">
        <section class="card">
          <div class="section-head">
            <div>
              <h2>${escapeHtml(getTikuName(session.tiku))}</h2>
              <p class="muted">第 ${Math.min(session.currentIndex + 1, session.totalTimuNum)} / ${session.totalTimuNum} 题 · 阶段：${session.stage === "fix" ? "订正错题" : "正常作答"}</p>
            </div>
          </div>
          <div class="progress"><span style="width:${progress}%"></span></div>
          <div class="question-board">
            <div class="question-text">${formatQuestion(session.currentTimuObj?.timu || "")}</div>
            <div class="answer-box">${formatAnswer(session.candidateAnswer || "请输入答案")}</div>
            <div class="flash ${session.flashType}">${session.flash ? escapeHtml(session.flash) : "&nbsp;"}</div>
          </div>
        </section>
        <section class="card">
          <div class="stack">
            <div class="tip">错题数：${session.wrongNums}</div>
            <div class="tip">帮助状态：${session.isHelped ? "已查看答案" : "未查看答案"}</div>
            <div class="operator-pad">
              <button data-answer-char="/">/</button>
              <button data-answer-char=".">.</button>
              <button data-answer-char="|">|</button>
              <button data-answer-action="backspace">删</button>
            </div>
            <div class="num-pad">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
                .map((num) => `<button data-answer-char="${num}">${num}</button>`)
                .join("")}
            </div>
            <div class="actions">
              <button class="btn warn" data-answer-action="help">看答案</button>
              <button class="btn" data-answer-action="skip-print">打印这套题</button>
              <button class="btn ghost" data-nav="practice-select" data-params="{}">返回列表</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function renderPracticeResult() {
    const result = state.practiceResult;
    if (!result) {
      return `<section class="card"><p>结果不存在。</p></section>`;
    }
    return `
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <section class="card">
          <h2>${escapeHtml(getTikuName(result.tiku))}</h2>
          <div class="result-score">${escapeHtml(result.scoreDisplay)}</div>
          <p class="muted">用时 ${result.timecost} 秒 · 错题 ${result.wrongNums} 个</p>
          <div class="stars">${"★".repeat(result.stars)}${"☆".repeat(5 - result.stars)}</div>
          <div class="actions" style="margin-top:18px">
            <button class="btn primary" data-restart-practice='${escapeAttr(JSON.stringify(result.tiku))}'>再来一次</button>
            <button class="btn" data-nav="practice-select" data-params="{}">返回题库</button>
          </div>
        </section>
        <section class="card">
          <h3>练习结果</h3>
          <p class="muted">本次练习已完成，可以直接返回题库继续练习，或重新开始当前题型。</p>
        </section>
      </div>
    `;
  }

  function renderPrintSelect() {
    const model = state.printSelect;
    const titles = model.selectById === 1 ? GRADE_TITLES : TYPE_TITLES;
    return `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>打印练习</h2>
            <p class="muted">先选题型，再进入打印预览、版式设置和浏览器打印。</p>
          </div>
        </div>
        <div class="toolbar">
          <button class="chip ${model.selectById === 1 ? "active" : ""}" data-print-tab="1">按年级</button>
          <button class="chip ${model.selectById === 2 ? "active" : ""}" data-print-tab="2">按题型</button>
        </div>
        <div class="chips">
          ${titles
            .map(
              (title, index) => `
                <button class="chip ${index === model.selectedId ? "active" : ""}" data-print-filter="${index}">
                  ${title}
                </button>
              `
            )
            .join("")}
        </div>
      </section>
      <section class="card" style="margin-top:18px">
        <div class="list">
          ${model.timulist
            .map((item) => {
              const tiku = normalizeTiku(item);
              return `
                <div class="list-item">
                  <div>
                    <strong>${escapeHtml(getTikuName(item))}</strong>
                  </div>
                  <div class="actions">
                    <button class="btn primary" data-open-print='${escapeAttr(JSON.stringify(tiku))}'>预览打印</button>
                    <button class="btn" data-start-practice='${escapeAttr(JSON.stringify(tiku))}'>在线练习</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderPrintPreview() {
    if (state.routeError) {
      return `<section class="card"><p>打印预览未能加载。</p></section>`;
    }
    const preview = state.printPreview;
    if (!preview) return `<section class="card"><p>正在生成打印预览...</p></section>`;
    const cols = preview.printStyleId === 1 ? preview.settings.reportCol : preview.printStyleId === 2 ? preview.settings.fillCol : preview.settings.verticalCol;
    const items = getPrintItems(preview);
    return `
      <div class="grid" style="grid-template-columns:340px 1fr">
        <aside class="card no-print">
          <h2>打印设置</h2>
          <div class="stack">
            <label>题量
              <select data-print-setting="count">
                ${[10, 20, 40, 50, 100].map((n) => `<option value="${n}" ${preview.printCount === n ? "selected" : ""}>${n}</option>`).join("")}
              </select>
            </label>
            <label>版式
              <select data-print-setting="style">
                ${PRINT_STYLE_LABELS.map((label, index) => `<option value="${index + 1}" ${preview.printStyleId === index + 1 ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>标题
              <input data-print-text="docTitle" value="${escapeAttr(preview.settings.docTitle)}" />
            </label>
            <label>姓名标签
              <input data-print-text="nameLabel" value="${escapeAttr(preview.settings.nameLabel)}" />
            </label>
            <label>得分标签
              <input data-print-text="scoreLabel" value="${escapeAttr(preview.settings.scoreLabel)}" />
            </label>
            <label>页脚文案
              <input data-print-text="jinju" value="${escapeAttr(preview.settings.jinju)}" />
            </label>
            <div class="actions">
              <button class="btn primary" data-print-action="browser-print">在线打印</button>
              <button class="btn" data-print-action="download-pdf">保存 PDF</button>
            </div>
          </div>
        </aside>
        <section class="preview-sheet">
          <div class="sheet-header">
            <div>
              <h2>${escapeHtml(preview.settings.docTitle)}</h2>
              <p class="muted">${escapeHtml(preview.settings.nameLabel)}: ________　${escapeHtml(preview.settings.scoreLabel)}: ________</p>
            </div>
            <div class="muted">${escapeHtml(preview.settings.jinju)}</div>
          </div>
          <div class="print-grid" style="--print-cols:${cols}">
            ${items.join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderTwentyfour() {
    if (state.routeError) {
      return `<section class="card"><p>24 点题目未能加载。</p></section>`;
    }
    const game = state.twentyfour;
    if (!game) return `<section class="card"><p>正在加载 24 点题目...</p></section>`;
    if (game.completed) {
      const avg = game.scoreArr.length
        ? (game.scoreArr.reduce((sum, value) => sum + value, 0) / game.scoreArr.length).toFixed(1)
        : "0.0";
      const totalTime = game.timecostArr.reduce((sum, value) => sum + value, 0);
      return `
        <section class="card">
          <h2>24 点完成</h2>
          <p class="result-score">${avg}</p>
          <p class="muted">总用时 ${(totalTime / 1000).toFixed(1)} 秒，共 ${game.totalTimuNum} 题</p>
          <div class="actions">
            <button class="btn primary" data-nav="twentyfour" data-params='${escapeAttr(
              JSON.stringify({ mode: 1, small_rate: 10, big_rate: 20, itemid: 1, timuid: -1, count: 5 })
            )}'>再玩一次</button>
          </div>
        </section>
      `;
    }
    return `
      <div class="twentyfour-board">
        <section class="card">
          <div class="section-head">
            <div>
              <h2>24 点</h2>
              <p class="muted">第 ${game.currentProgress + 1} / ${game.totalTimuNum} 题</p>
            </div>
          </div>
          <div class="num-tiles">
            ${game.currentTimuPageObject
              .map(
                (item, index) => `
                  <button class="tile ${item.visibility !== "visible" ? "hidden" : ""} ${item.selected}" data-twentyfour-num="${index}">
                    ${escapeHtml(String(item.disp))}
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="operator-pad" style="margin-top:16px">
            ${["+", "-", "×", "÷"]
              .map(
                (symbol, index) => `
                  <button class="operator ${game.operatorStatus[index]}" data-twentyfour-op="${index}">${symbol}</button>
                `
              )
              .join("")}
          </div>
          <div class="actions" style="margin-top:18px">
            <button class="btn warn" data-twentyfour-action="answer">看解法</button>
            <button class="btn" data-twentyfour-action="reset">重置</button>
            <button class="btn" data-twentyfour-action="next">换一题</button>
          </div>
          ${game.helpText ? `<div class="tip" style="margin-top:16px;white-space:pre-wrap">${escapeHtml(game.helpText)}</div>` : ""}
        </section>
      </div>
    `;
  }

  function initTwentyfourPreview() {
    const items = parseJsonParam(state.route.params.items);
    state.twentyfourPreview = {
      title: decodeURIComponent(state.route.params.title || "24点练习"),
      items: Array.isArray(items) ? items : [],
      mode: state.route.params.mode || "print",
    };
  }

  function renderTwentyfourPreview() {
    if (state.routeError) {
      return `<section class="card"><p>24点打印预览未能加载。</p></section>`;
    }
    const preview = state.twentyfourPreview;
    if (!preview) {
      return `<section class="card"><p>正在生成24点打印预览...</p></section>`;
    }
    return `
      <div class="grid" style="grid-template-columns:320px 1fr">
        <aside class="card no-print">
          <h2>24点打印预览</h2>
          <div class="stack">
            <div class="tip">当前共 ${preview.items.length} 题。</div>
            <div class="actions">
              <button class="btn primary" data-twentyfour-preview-action="print">在线打印</button>
              <button class="btn" data-twentyfour-preview-action="pdf">保存PDF</button>
              <button class="btn ghost" data-nav="twentyfour" data-params='${escapeAttr(
                JSON.stringify({ mode: 1, small_rate: 10, big_rate: 20, itemid: 1, timuid: -1, count: 5 })
              )}'>返回24点</button>
            </div>
          </div>
        </aside>
        <section class="preview-sheet" id="twentyfour-preview-sheet">
          <div class="sheet-header">
            <div>
              <h2>${escapeHtml(preview.title)}</h2>
              <p class="muted">姓名: ________　得分: ________</p>
            </div>
            <div class="muted">请用加减乘除算出 24</div>
          </div>
          <div class="print-grid" style="--print-cols:2">
            ${preview.items
              .map((item, index) => {
                const nums = Array.isArray(item.nums) ? item.nums : [];
                return `
                  <div class="print-item vertical">
                    <div style="font-size:28px;font-weight:700;letter-spacing:2px;margin-bottom:14px;">${index + 1}. ${nums.map((n) => escapeHtml(String(n))).join("   ")}</div>
                    <div style="border-bottom:1px dashed #b8c3c8;height:28px;margin-top:10px;"></div>
                    <div style="border-bottom:1px dashed #b8c3c8;height:28px;margin-top:10px;"></div>
                    <div style="border-bottom:1px dashed #b8c3c8;height:28px;margin-top:10px;"></div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderArticle() {
    return `
      <section class="card iframe-wrap">
        <div class="section-head">
          <h2>文章</h2>
          <a class="btn" href="${escapeAttr(state.articleUrl)}" target="_blank" rel="noreferrer">新窗口打开</a>
        </div>
        <iframe src="${escapeAttr(state.articleUrl)}" title="article"></iframe>
      </section>
    `;
  }

  function renderFeedback() {
    return `
      <section class="card feedback">
        <h2>题目反馈</h2>
        <div class="stack">
          <label>题目
            <input data-feedback="question" value="${escapeAttr(state.feedback.question)}" />
          </label>
          <label>问题描述
            <textarea data-feedback="message">${escapeHtml(state.feedback.message)}</textarea>
          </label>
          <label>联系方式
            <input data-feedback="contact" value="${escapeAttr(state.feedback.contact)}" />
          </label>
          <div class="actions">
            <button class="btn primary" data-feedback-action="copy">复制反馈内容</button>
            <button class="btn" data-feedback-action="mail">生成邮件</button>
          </div>
        </div>
      </section>
    `;
  }

  function handleClick(event) {
    const el = event.target.closest("[data-nav], [data-practice-tab], [data-practice-filter], [data-start-practice], [data-answer-char], [data-answer-action], [data-restart-practice], [data-print-tab], [data-print-filter], [data-open-print], [data-print-action], [data-save-nickname], [data-twentyfour-op], [data-twentyfour-num], [data-twentyfour-action], [data-twentyfour-preview-action], [data-feedback-action], [data-auth-action]");
    if (!el) return;

    if (el.dataset.nav) {
      routeTo(el.dataset.nav, JSON.parse(el.dataset.params || "{}"));
      return;
    }

    if (el.dataset.practiceTab) {
      state.practiceSelect.selectById = Number(el.dataset.practiceTab);
      state.practiceSelect.selectedId = 0;
      localStorage.setItem("selectById", String(state.practiceSelect.selectById));
      localStorage.setItem("selectedId", "0");
      bootstrapRoute();
      return;
    }

    if (el.dataset.practiceFilter) {
      state.practiceSelect.selectedId = Number(el.dataset.practiceFilter);
      localStorage.setItem("selectedId", String(state.practiceSelect.selectedId));
      bootstrapRoute();
      return;
    }

    if (el.dataset.startPractice) {
      const tiku = JSON.parse(el.dataset.startPractice);
      routeTo("practice-run", { tiku: encodeURIComponent(JSON.stringify(tiku)), docid: -1 });
      return;
    }

    if (el.dataset.answerChar) {
      mutateAnswer(el.dataset.answerChar);
      return;
    }

    if (el.dataset.answerAction) {
      handleAnswerAction(el.dataset.answerAction);
      return;
    }

    if (el.dataset.restartPractice) {
      const tiku = JSON.parse(el.dataset.restartPractice);
      routeTo("practice-run", { tiku: encodeURIComponent(JSON.stringify(tiku)), docid: -1 });
      return;
    }

    if (el.dataset.printTab) {
      state.printSelect.selectById = Number(el.dataset.printTab);
      state.printSelect.selectedId = 0;
      localStorage.setItem("printSelectById", String(state.printSelect.selectById));
      localStorage.setItem("printSelectedId", "0");
      bootstrapRoute();
      return;
    }

    if (el.dataset.printFilter) {
      state.printSelect.selectedId = Number(el.dataset.printFilter);
      localStorage.setItem("printSelectedId", String(state.printSelect.selectedId));
      bootstrapRoute();
      return;
    }

    if (el.dataset.openPrint) {
      const tiku = JSON.parse(el.dataset.openPrint);
      routeTo("print-preview", {
        tiku: encodeURIComponent(JSON.stringify(tiku)),
        docid: -1,
        printcount: 20,
        byid: 2,
        pagenum: -1,
      });
      return;
    }

    if (el.dataset.printAction) {
      handlePrintAction(el.dataset.printAction);
      return;
    }

    if (el.dataset.saveNickname) {
      const input = document.getElementById("nickname-input");
      localStorage.setItem("nickname", input.value.trim());
      state.homeStats.nickname = input.value.trim();
      if (state.practiceResult) state.practiceResult.nickname = input.value.trim();
      notify("昵称已保存。");
      render();
      return;
    }

    if (el.dataset.twentyfourOp !== undefined) {
      select24Operator(Number(el.dataset.twentyfourOp));
      return;
    }

    if (el.dataset.twentyfourNum !== undefined) {
      select24Number(Number(el.dataset.twentyfourNum));
      return;
    }

    if (el.dataset.twentyfourAction) {
      handle24Action(el.dataset.twentyfourAction);
      return;
    }

    if (el.dataset.twentyfourPreviewAction) {
      handleTwentyfourPreviewAction(el.dataset.twentyfourPreviewAction);
      return;
    }

    if (el.dataset.feedbackAction) {
      handleFeedbackAction(el.dataset.feedbackAction);
      return;
    }

    if (el.dataset.authAction) {
      handleAuthAction(el.dataset.authAction);
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.dataset.printSetting === "count") {
      reloadPrintPreview({ printCount: Number(target.value), docId: -1 });
      return;
    }
    if (target.dataset.printSetting === "style") {
      state.printPreview.printStyleId = Number(target.value);
      rebuildPrintPreview();
      render();
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (target.dataset.printText) {
      state.printPreview.settings[target.dataset.printText] = target.value;
      return;
    }
    if (target.dataset.feedback) {
      state.feedback[target.dataset.feedback] = target.value;
      return;
    }
    if (target.dataset.authField) {
      state.auth.form[target.dataset.authField] = target.value;
      state.auth.error = "";
      return;
    }
  }

  function mutateAnswer(char) {
    const session = state.practiceSession;
    if (!session) return;
    if (char === "|" && session.candidateAnswer.includes("|")) return;
    if (char === "." && !session.candidateAnswer.includes("|")) {
      if (session.candidateAnswer.includes(".")) return;
    }
    session.candidateAnswer += char;
    checkPracticeAnswer();
    render();
  }

  function handleAnswerAction(action) {
    const session = state.practiceSession;
    if (!session) return;
    if (action === "backspace") {
      session.candidateAnswer = session.candidateAnswer.slice(0, -1);
      render();
      return;
    }
    if (action === "help") {
      session.candidateAnswer = session.currentTimuObj.daan.replace(/\|/g, "|");
      session.isHelped = true;
      checkPracticeAnswer(true);
      render();
      return;
    }
    if (action === "skip-print") {
      routeTo("print-preview", {
        tiku: encodeURIComponent(JSON.stringify(session.tiku)),
        docid: session.docId,
        printcount: -1,
        byid: 2,
        pagenum: -1,
      });
      return;
    }
  }

  function checkPracticeAnswer(triggeredByHelp = false) {
    const session = state.practiceSession;
    const candidate = session.candidateAnswer;
    const right = normalizeAnswer(session.currentTimuObj.daan);
    const normalized = normalizeAnswer(candidate);
    if (mathAnswerEqual(normalized, right)) {
      session.flash = "回答正确";
      session.flashType = "ok";
      nextPracticeQuestion(true, triggeredByHelp);
      return;
    }
    if (String(candidate).length >= String(session.currentTimuObj.daan).length) {
      session.flash = "回答错误";
      session.flashType = "bad";
      if (session.stage === "fix") {
        session.candidateAnswer = "";
        render();
        return;
      }
      if (session.stage !== "fix") {
        session.wrongTimuSet.push(session.timuObj[session.currentIndex]);
        session.wrongNums += 1;
      }
      nextPracticeQuestion(false, false);
    }
  }

  function nextPracticeQuestion(correct, helped) {
    const session = state.practiceSession;
    setTimeout(() => {
      if (correct) {
        session.totalRight += 1;
      }
      if (session.stage === "fix") {
        session.wrongTimuSet.pop();
      } else {
        session.currentIndex += 1;
      }

      const finishedNormal = session.currentIndex >= session.totalTimuNum;
      if (finishedNormal && session.stage !== "fix" && session.wrongTimuSet.length) {
        session.stage = "fix";
        loadPracticeQuestion();
        render();
        return;
      }

      const finishedFix = session.stage === "fix" && session.wrongTimuSet.length === 0;
      if ((finishedNormal && session.stage !== "fix" && session.wrongTimuSet.length === 0) || finishedFix) {
        const timecost = Date.now() - session.startedAt;
        const rawScore = Math.max(0, 100 - session.wrongNums * 10);
        routeTo("practice-result", {
          tiku: encodeURIComponent(JSON.stringify(session.tiku)),
          score: rawScore,
          timecost,
          wrongnums: session.wrongNums,
        });
        return;
      }

      if (session.stage === "fix") {
        loadPracticeQuestion();
      } else {
        session.currentIndex = Math.min(session.currentIndex, session.totalTimuNum - 1);
        loadPracticeQuestion();
      }
      render();
    }, helped ? 2000 : 220);
  }

  async function reloadPrintPreview(patch) {
    const preview = state.printPreview;
    const next = { ...preview, ...patch };
    const payload = await api("createdoc", {
      xlid: String(next.tiku.xlid),
      totalcount: String(next.printCount),
      lastdocid: String(preview.docId || -1),
    });
    next.docId = payload.data.docId;
    next.timus = payload.data.timus || [];
    state.printPreview = next;
    rebuildPrintPreview();
    render();
  }

  async function handlePrintAction(action) {
    const preview = state.printPreview;
    if (!preview) return;
    if (!(await ensurePrintPermission())) return;
    if (action === "browser-print") {
      window.print();
      return;
    }
    if (action === "download-pdf" || action === "download-answer") {
      const displaydaan = action === "download-answer" ? 1 : 0;
      try {
        const params = new URLSearchParams({
          function: "downloaddoc",
          docid: String(preview.docId),
          displaydaan: String(displaydaan),
          printstyleid: String(preview.printStyleId),
          setting: "2",
          doctitle: preview.settings.docTitle,
          namelabel: preview.settings.nameLabel,
          scorelabel: preview.settings.scoreLabel,
          jinju: preview.settings.jinju,
        });
        const response = await fetch(`/api/bridge.php?${params.toString()}`);
        const payload = await readJsonResponse(response);
        if (response.status === 401 || response.status === 403) {
          showPrintPermissionDialog(payload);
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const filePath = payload && payload.data && payload.data.filePath ? payload.data.filePath : "";
        if (!filePath) {
          notify("保存 PDF 失败。");
          return;
        }
        const downloadUrl = `/api/static/kousuan_v2/pdf/${filePath}`;
        triggerBrowserDownload(downloadUrl, `${preview.settings.docTitle || "口算天天练"}.pdf`);
      } catch (error) {
        notify("保存 PDF 失败。");
      }
    }
  }

  function triggerBrowserDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function getPrintItems(preview) {
    if (preview.flagFenshu) {
      return preview.timus.map((item, index) => `<div class="print-item">${index + 1}. ${formatQuestion(item.timu)}</div>`);
    }
    if (preview.printStyleId === 1) {
      return preview.timus.map((item, index) => `<div class="print-item">${index + 1}. ${formatQuestion(item.timu)}</div>`);
    }
    if (preview.printStyleId === 2) {
      return preview.fillTimus.map((item, index) => `<div class="print-item">${index + 1}. ${formatQuestion(item)}</div>`);
    }
    return preview.shushiTimus.map((item, index) => `
      <div class="print-item vertical">
        <div>${index + 1}. ${escapeHtml(item.num1)}</div>
        <div style="text-align:right">${escapeHtml(item.operatorValue)} ${escapeHtml(item.num2)}</div>
        <div style="border-top:1px solid #000;margin-top:6px;padding-top:6px;min-height:22px"></div>
      </div>
    `);
  }

  function select24Operator(index) {
    const game = state.twentyfour;
    game.operatorStatus = ["", "", "", ""];
    game.operatorStatus[index] = "selected";
    game.selectedOperator = index;
    render();
  }

  function select24Number(index) {
    const game = state.twentyfour;
    const items = game.currentTimuPageObject;
    if (items[index].visibility !== "visible") return;
    const selectedNumIndex = items.findIndex((item) => item.selected === "selected");

    if (selectedNumIndex === index) {
      items[index].selected = "";
      render();
      return;
    }

    items.forEach((item) => {
      item.selected = "";
    });
    items[index].selected = "selected";

    if (selectedNumIndex >= 0 && game.selectedOperator >= 0) {
      const first = items[selectedNumIndex];
      const second = items[index];
      const result = operate24(game.selectedOperator, first.value, second.value);
      second.value = result;
      second.disp = format24Value(result);
      second.fontsize = String(second.disp).length > 6 ? 2 : 4;
      first.visibility = "hidden";
      first.selected = "";
      second.selected = "";
      game.selectedOperator = -1;
      game.operatorStatus = ["", "", "", ""];
      check24Answer();
    }
    render();
  }

  async function handle24Action(action) {
    const game = state.twentyfour;
    if (!game) return;
    if (action === "print-online") {
      if (!(await ensurePrintPermission())) return;
      routeTo("twentyfour-preview", {
        title: encodeURIComponent("24点练习"),
        items: encodeURIComponent(JSON.stringify(game.timuObjectArr || [])),
        mode: "print",
      });
      return;
    }
    if (action === "save-pdf") {
      if (!(await ensurePrintPermission())) return;
      routeTo("twentyfour-preview", {
        title: encodeURIComponent("24点练习"),
        items: encodeURIComponent(JSON.stringify(game.timuObjectArr || [])),
        mode: "pdf",
      });
      return;
    }
    if (action === "answer") {
      game.ishelp = 1;
      game.helpText = game.currentTimuObject.answer.replace(/\|/g, "\n");
      render();
      return;
    }
    if (action === "reset") {
      setTwentyfourTimu();
      render();
      return;
    }
    if (action === "next") {
      api("get24diantiku", {
        mode: String(game.mode),
        small_rate: "10",
        big_rate: "20",
        itemid: String(game.itemid),
        timuid: "-1",
        count: "1",
      })
        .then((payload) => {
          const backup = deal24Data(payload.data || [])[0];
          game.timuObjectArr[game.currentProgress] = backup;
          setTwentyfourTimu();
          render();
        })
        .catch(() => notify("换题失败。"));
    }
  }

  async function handleTwentyfourPreviewAction(action) {
    if (!(await ensurePrintPermission())) return;
    if (action === "print") {
      window.print();
      return;
    }
    if (action === "pdf") {
      const preview = state.twentyfourPreview;
      if (!preview) return;
      try {
        const response = await fetch("/api/twentyfour-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: preview.title,
            items: preview.items,
          }),
        });
        if (response.status === 401 || response.status === 403) {
          const payload = await readJsonResponse(response);
          showPrintPermissionDialog(payload);
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        triggerBrowserDownload(url, `${preview.title || "24点练习"}.pdf`);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } catch (error) {
        notify("保存PDF失败。");
      }
    }
  }

  function printTwentyfourSheet(game, mode) {
    const items = Array.isArray(game.timuObjectArr) ? game.timuObjectArr : [];
    const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (!win) {
      notify("无法打开打印窗口。");
      return;
    }
    const cards = items
      .map((item, index) => {
        const nums = Array.isArray(item.nums) ? item.nums : [];
        return `
          <div class="item">
            <div class="nums">${index + 1}. ${nums.map((n) => escapeHtml(String(n))).join("   ")}</div>
            <div class="line"></div>
            <div class="line"></div>
            <div class="line"></div>
          </div>
        `;
      })
      .join("");

    win.document.open();
    win.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <title>24点打印</title>
          <style>
            body { font-family: "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; margin: 24px; color: #111; }
            .head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 24px; }
            .head h1 { margin:0; font-size: 28px; }
            .meta { color:#555; }
            .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 24px; }
            .item { border: 1px solid #d8dfe3; border-radius: 12px; padding: 16px; min-height: 150px; }
            .nums { font-size: 28px; font-weight: 700; letter-spacing: 2px; margin-bottom: 20px; }
            .line { border-bottom: 1px dashed #b8c3c8; height: 28px; margin-top: 12px; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <div class="head">
            <div>
              <h1>24点练习</h1>
              <div class="meta">姓名：________　得分：________</div>
            </div>
            <div class="meta">请用加减乘除算出 24</div>
          </div>
          <div class="grid">${cards}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.document.title = "24点打印";
    const style = win.document.createElement("style");
    style.textContent = ".toolbar{display:flex;gap:12px;margin-bottom:20px}.toolbar button{border:1px solid #d8dfe3;background:#fff;border-radius:999px;padding:10px 16px;cursor:pointer}@media print{.toolbar{display:none}}";
    win.document.head.appendChild(style);
    const toolbar = win.document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.innerHTML = '<button type="button">在线打印</button><button type="button">下载为PDF</button>';
    const buttons = toolbar.querySelectorAll("button");
    buttons[0].addEventListener("click", () => win.print());
    buttons[1].addEventListener("click", () => win.print());
    win.document.body.insertBefore(toolbar, win.document.body.firstChild);
    const titleNode = win.document.querySelector(".head h1");
    if (titleNode) titleNode.textContent = "24点练习";
    const metaNodes = win.document.querySelectorAll(".meta");
    if (metaNodes[0]) metaNodes[0].textContent = "姓名：________　得分：________";
    if (metaNodes[1]) metaNodes[1].textContent = "请用加减乘除算出 24";
    win.focus();
    if (mode === "print" || mode === "pdf") {
      win.print();
    }
  }

  function check24Answer() {
    const game = state.twentyfour;
    const visible = game.currentTimuPageObject.filter((item) => item.visibility === "visible");
    if (visible.length === 1 && Math.abs(Number(visible[0].value) - 24) < 0.001) {
      game.scoreArr.push(game.ishelp ? 0 : 100);
      game.timecostArr.push(Date.now() - game.loadTime);
      game.currentProgress += 1;
      if (game.currentProgress >= game.totalTimuNum) {
        game.completed = true;
      } else {
        setTwentyfourTimu();
      }
    }
  }

  function handleFeedbackAction(action) {
    const content = [
      `题目: ${state.feedback.question || ""}`,
      `描述: ${state.feedback.message || ""}`,
      `联系方式: ${state.feedback.contact || ""}`,
    ].join("\n");
    if (action === "copy") {
      navigator.clipboard.writeText(content).then(() => notify("反馈内容已复制。"));
      return;
    }
    if (action === "mail") {
      window.location.href = `mailto:?subject=${encodeURIComponent("口算儿童之家反馈")}&body=${encodeURIComponent(content)}`;
    }
  }

  function normalizeTiku(item) {
    return {
      ...item,
      page: item.page || getRealPage(Number(item.xlid)),
    };
  }

  async function ensureAuth() {
    if (state.auth.checked) return;
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        state.auth.user = data.user || null;
      } else {
        state.auth.user = null;
      }
    } catch {
      state.auth.user = null;
    }
    state.auth.checked = true;
  }

  async function handleAuthAction(action) {
    if (action === "switch-mode") {
      state.auth.mode = state.auth.mode === "login" ? "register" : "login";
      state.auth.error = "";
      render();
      return;
    }
    if (action === "logout") {
      await fetch("/api/auth/logout", { method: "POST" });
      state.auth.user = null;
      state.auth.checked = true;
      routeTo("login");
      return;
    }
    if (action === "login" || action === "register") {
      try {
        const response = await fetch(`/api/auth/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.auth.form),
        });
        const data = await response.json();
        if (!response.ok) {
          state.auth.error = data.error || "登录失败";
          render();
          return;
        }
        state.auth.user = data.user;
        state.auth.checked = true;
        state.auth.error = "";
        state.auth.form.password = "";
        routeTo("home");
      } catch {
        state.auth.error = "请求失败";
        render();
      }
    }
  }

  function renderLogin() {
    return `
      <section class="card login-card">
        <div class="section-head">
          <h2>登录</h2>
        </div>
        <div class="stack login-form">
          <p class="muted login-subtitle">请输入账号和密码进入系统。</p>
          <label>账号
            <input data-auth-field="username" value="${escapeAttr(state.auth.form.username)}" placeholder="字母/数字/下划线" />
          </label>
          <label>密码
            <input type="password" data-auth-field="password" value="${escapeAttr(state.auth.form.password)}" placeholder="至少6位" />
          </label>
          ${state.auth.error ? `<div class="tip" style="color:#d84b5d">${escapeHtml(state.auth.error)}</div>` : ""}
          <div class="actions login-actions">
            <button class="btn primary" data-auth-action="login">登录</button>
          </div>
        </div>
      </section>
    `;
  }

  async function handleAuthAction(action) {
    if (action === "logout") {
      await fetch("/api/auth/logout", { method: "POST" });
      state.auth.user = null;
      state.auth.checked = true;
      routeTo("login");
      return;
    }
    if (action === "login") {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.auth.form),
        });
        const data = await response.json();
        if (!response.ok) {
          state.auth.error = data.error || "登录失败";
          render();
          return;
        }
        state.auth.user = data.user;
        state.auth.checked = true;
        state.auth.error = "";
        state.auth.form.password = "";
        routeTo("home");
      } catch {
        state.auth.error = "请求失败";
        render();
      }
    }
  }

  function getTikuName(item) {
    if (item && item.xlname) return item.xlname;
    if (item && item.title) return item.title;
    return "未命名题型";
  }

  async function handleAuthAction(action) {
    if (action === "logout") {
      await fetch("/api/auth/logout", { method: "POST" });
      state.auth.user = null;
      state.auth.checked = true;
      routeTo("login");
      return;
    }
    if (action === "login") {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.auth.form),
        });
        const raw = await response.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }
        if (!response.ok) {
          state.auth.error = data.error || `HTTP ${response.status}`;
          render();
          return;
        }
        state.auth.user = data.user;
        state.auth.checked = true;
        state.auth.error = "";
        state.auth.form.password = "";
        routeTo("home");
      } catch (error) {
        state.auth.error = error && error.message ? error.message : "请求失败";
        render();
      }
    }
  }

  function parseJsonParam(value) {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }

  function setLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function notify(text) {
    state.notification = text;
    render();
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      state.notification = "";
      render();
    }, 2400);
  }

  function buildRouteErrorMessage(error) {
    const message = error && error.message ? error.message : "未知错误";
    return message;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function formatQuestion(text) {
    return escapeHtml(String(text || ""))
      .replace(/脳/g, "×")
      .replace(/梅/g, "÷")
      .replace(/路路路路路路/g, " | ");
  }

  function formatAnswer(text) {
    return text === "请输入答案" ? text : formatQuestion(text);
  }

  function mathAnswerEqual(a, b) {
    if (a === b) return true;
    const left = Number(a);
    const right = Number(b);
    if (!Number.isNaN(left) && !Number.isNaN(right)) {
      return Math.abs(left - right) < 0.001;
    }
    return false;
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .replace(/%/g, "")
      .replace(/\|0/g, "")
      .replace(/\|/g, "|");
  }

  function updateLocalStars(xlid, stars) {
    const list = getLocal("local_stars", []);
    const existing = list.find((item) => Number(item.xlid) === Number(xlid));
    if (existing) {
      existing.stars = stars;
    } else {
      list.push({ xlid, stars });
    }
    setLocal("local_stars", list);
  }

  function getStarsFromLocal(xlid) {
    const list = getLocal("local_stars", []);
    const found = list.find((item) => Number(item.xlid) === Number(xlid));
    return found ? Number(found.stars || 0) : 0;
  }

  function score2stars(score) {
    if (score >= 80) return 5;
    if (score >= 60) return 4;
    if (score >= 40) return 3;
    if (score >= 20) return 2;
    return 1;
  }

  function fuFenZhi(score) {
    if (score < 60) return score + 20;
    if (score < 80) return 80 + (score - 60) / 2;
    if (score < 90) return 90 + (score - 80) / 2;
    if (score < 95) return 95 + (score - 90) / 2;
    return 100;
  }

  function getRealPage(xlid) {
    if (xlid >= 103 && xlid <= 107) return "timu-danweixuanze";
    if (xlid === 80 || xlid === 89) return "timu-bijiaodaxiao";
    if (xlid === 90 || xlid === 93) return "timu-percent";
    if ((xlid >= 73 && xlid <= 79) || (xlid >= 85 && xlid <= 88) || xlid === 96 || xlid === 94) return "timu-fenshu";
    if (xlid === 97) return "timu-jiefangcheng";
    return "timu";
  }

  function setTimuStyle(xlid, timus, page) {
    return timus.map((item) => {
      const next = { ...item };
      let timu = String(next.timu);
      let daan = String(next.daan);
      const s = parseInt(next.timu, 10);
      const n = parseInt(next.daan, 10);
      if (xlid === 142 || xlid === 143) {
        const result = s % n !== 0 ? `${Math.floor(s / n)}路路路路路路${s % n}` : `${s / n}`;
        next.timu = `( )梅${next.daan}=${result}`;
        next.daan = String(s);
      } else if (xlid === 20) {
        next.timu = `${s}+?=100`;
      } else if (xlid === 22) {
        next.timu = `${s}+?=1000`;
      } else if (xlid === 148) {
        next.timu = `${s}+?=10`;
      } else if (xlid === 81) {
        next.timu = `${timu.replace("|", "和")}的最大公因数是( )`;
      } else if (xlid === 82) {
        next.timu = `${timu.replace("|", "和")}的最小公倍数是( )`;
      } else if (xlid === 83) {
        next.timu = `${timu.replace("|", "和")}的最大公因数和最小公倍数分别是( )路路路路路路( )`;
      } else if (xlid === 84 || xlid === 122) {
        const arr = timu.split("|").map(Number);
        next.timu = `${arr[0]}、${arr[1]}和${arr[2]}的${xlid === 84 ? "最小公倍数" : "最大公因数"}是( )`;
      } else if (xlid === 123) {
        const arr = timu.split("|").map(Number);
        next.timu = `${arr[0]}、${arr[1]}和${arr[2]}的最大公因数和最小公倍数分别是( )路路路路路路( )`;
      } else if (![90, 124, 125, 97].includes(xlid)) {
        if (xlid === 92) {
          next.timu = `${timu}=?`;
        } else if (xlid === 93) {
          next.timu = `${timu.replace(/\*/g, "脳").replace(/c/g, "梅")}=?`;
        } else if (!page.includes("fenshu") && !page.includes("timu-jiefangcheng")) {
          next.timu = `${timu}?`;
        }
      }
      next.standardized_daan = daan;
      return next;
    });
  }

  function setSpecialTimuStyle4Printview(xlid, timus) {
    return timus.map((item) => {
      const next = { ...item };
      const raw = String(next.timu);
      if (xlid === 81 || xlid === 82) {
        const parts = raw.split("|").map(Number);
        next.timu = `${parts[0]}和${parts[1]}( )`;
      } else if (xlid === 83) {
        const parts = raw.split("|").map(Number);
        next.timu = `${parts[0]}和${parts[1]}( )( )`;
      } else if (xlid === 84 || xlid === 122) {
        const parts = raw.split("|").map(Number);
        next.timu = `${parts[0]}、${parts[1]}和${parts[2]}( )`;
      } else if (xlid === 123) {
        const parts = raw.split("|").map(Number);
        next.timu = `${parts[0]}、${parts[1]}和${parts[2]}( )( )`;
      } else if (xlid === 92) {
        next.timu = `${raw}=`;
      } else if (xlid === 93) {
        next.timu = `${raw.replace(/\*/g, "脳").replace(/c/g, "梅")}=`;
      }
      return next;
    });
  }

  function setSpecialFillTimuStyle4Printview(xlid, timus) {
    return timus.map((item) => {
      let text = String(item.timu);
      if (xlid === 20) text = `(  )+${text}=100`;
      else if (xlid === 22) text = `(  )+${text}=1000`;
      else if (xlid === 148) text = `(  )+${text}=10`;
      else if (xlid === 142 || xlid === 143) {
        const quotient = Math.floor(Number(item.timu) / Number(item.daan));
        const remain = Number(item.timu) % Number(item.daan);
        text = remain !== 0 ? `(  )梅${item.daan}=${quotient}路路路路路路${remain}` : `(  )梅${item.daan}=${quotient}`;
      }
      return text;
    });
  }

  function batchSwitchToFillTimu(timus, fillCol, operatorNum) {
    return timus.map((item, index) => switchToFillTimu(item.timu, item.daan, (index % fillCol) % operatorNum));
  }

  function switchToFillTimu(timu, daan, blankIndex) {
    const cleanAnswer = String(daan).includes("|") ? String(daan).replace(/\|0/g, "").replace(/\|/g, "路路路路路路") : daan;
    const operatorNum = getOperatorNum(timu) + 1;
    if (operatorNum === 2) {
      const [left, right, op] = decodeTimu(timu);
      if (blankIndex === 0) return `( )${op}${right}=${cleanAnswer}`;
      return `${left}${op}( )=${cleanAnswer}`;
    }
    const [first, second, third, op1, op2] = decodeTimu3(timu);
    if (blankIndex === 0) return `( )${op1}${second}${op2}${third}=${cleanAnswer}`;
    if (blankIndex === 1) return `${first}${op1}( )${op2}${third}=${cleanAnswer}`;
    return `${first}${op1}${second}${op2}( )=${cleanAnswer}`;
  }

  function batchSwitchToShushiTimu(timus) {
    return timus.map((item) => switchToShushiTimu(item.timu));
  }

  function switchToShushiTimu(timu) {
    const [num1, num2, operatorValue] = decodeTimu(timu);
    return { timu_content: timu, num1, num2, operatorValue };
  }

  function getOperatorNum(timu) {
    return ["+", "-", "脳", "梅"].reduce((sum, token) => sum + getCharTimes(timu, token), 0);
  }

  function getCharTimes(text, token) {
    return String(text)
      .split("")
      .filter((char) => char === token).length;
  }

  function decodeTimu(text) {
    const clean = String(text).replace("=", "");
    for (const operator of ["+", "-", "脳", "梅"]) {
      const index = clean.indexOf(operator);
      if (index >= 0) {
        return [clean.slice(0, index), clean.slice(index + 1), operator];
      }
    }
    return [clean, "", "+"];
  }

  function decodeTimu3(text) {
    const clean = String(text).replace("=", "");
    const ops = ["+", "-", "脳", "梅"];
    const firstPos = getFirstPosition(clean, ops);
    const op1 = clean[firstPos];
    const secondPos = getFirstPosition(clean.slice(firstPos + 1), ops) + firstPos + 1;
    const op2 = clean[secondPos];
    return [clean.slice(0, firstPos), clean.slice(firstPos + 1, secondPos), clean.slice(secondPos + 1), op1, op2];
  }

  function getFirstPosition(text, chars) {
    return Math.min(...chars.map((char) => {
      const index = text.indexOf(char);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    }));
  }

  function buildFenshuExpre(expression) {
    return expression;
  }

  function deal24Data(items) {
    return items.map((item) => {
      const nums = shuffleArray(String(item.timu).split("-").map(Number));
      const answers = [item.daan1, item.daan2, item.daan3].filter(Boolean).join("\n");
      return { timuid: item.timuid, nums, answer: answers };
    });
  }

  function shuffleArray(list) {
    const next = [...list];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function operate24(operatorIndex, left, right) {
    if (operatorIndex === 0) return Number(left) + Number(right);
    if (operatorIndex === 1) return Number(left) - Number(right);
    if (operatorIndex === 2) return Number(left) * Number(right);
    return Number(left) / Number(right);
  }

  function format24Value(value) {
    const num = Number(value);
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  document.addEventListener("click", interceptPrintClicks, true);

  function renderLogin() {
    const mode = state.auth.mode === "register" ? "register" : "login";
    return `
      <section class="card login-card">
        <div class="section-head">
          <h2>${mode === "register" ? "注册" : "登录"}</h2>
        </div>
        <div class="stack login-form">
          <p class="muted login-subtitle">${mode === "register" ? "注册后可以在线练习，打印权限需开通。" : "请输入账号和密码进入系统。"}</p>
          <label>账号
            <input data-auth-field="username" value="${escapeAttr(state.auth.form.username)}" placeholder="字母/数字/下划线" />
          </label>
          <label>密码
            <input type="password" data-auth-field="password" value="${escapeAttr(state.auth.form.password)}" placeholder="至少6位" />
          </label>
          ${state.auth.error ? `<div class="tip" style="color:#d84b5d">${escapeHtml(state.auth.error)}</div>` : ""}
          <div class="actions login-actions">
            <button class="btn primary" data-auth-action="${mode}">${mode === "register" ? "注册并登录" : "登录"}</button>
            <button class="btn" data-auth-action="switch-mode">${mode === "register" ? "已有账号，去登录" : "没有账号，去注册"}</button>
          </div>
        </div>
      </section>
    `;
  }

  async function handleAuthAction(action) {
    if (action === "switch-mode") {
      state.auth.mode = state.auth.mode === "register" ? "login" : "register";
      state.auth.error = "";
      render();
      return;
    }
    if (action === "logout") {
      await fetch("/api/auth/logout", { method: "POST" });
      state.auth.user = null;
      state.auth.checked = true;
      routeTo("login");
      return;
    }
    if (action === "login" || action === "register") {
      try {
        const response = await fetch(`/api/auth/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.auth.form),
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          state.auth.error = data.error || `HTTP ${response.status}`;
          render();
          return;
        }
        state.auth.user = data.user;
        state.auth.checked = true;
        state.auth.error = "";
        state.auth.mode = "login";
        state.auth.form.password = "";
        routeTo("home");
      } catch (error) {
        state.auth.error = error && error.message ? error.message : "请求失败";
        render();
      }
    }
  }

  async function interceptPrintClicks(event) {
    const el = event.target.closest(
      '[data-nav], [data-open-print], [data-print-action], [data-answer-action], [data-twentyfour-action], [data-twentyfour-preview-action]'
    );
    if (!el || !isPrintEntry(el)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!(await ensurePrintPermission())) {
      return;
    }

    runPrintEntry(el);
  }

  function isPrintEntry(el) {
    return (
      Boolean(el.dataset.printAction) ||
      el.dataset.twentyfourAction === "print-online" ||
      el.dataset.twentyfourAction === "save-pdf" ||
      el.dataset.twentyfourPreviewAction === "print" ||
      el.dataset.twentyfourPreviewAction === "pdf"
    );
  }

  async function ensurePrintPermission() {
    if (userHasActiveMembership(state.auth.user)) {
      return true;
    }
    try {
      const response = await fetch("/api/auth/print-permission");
      const data = await readJsonResponse(response);
      if (data.canPrint || data.isMember) {
        if (state.auth.user) {
          state.auth.user = {
            ...state.auth.user,
            canPrint: true,
            isMember: true,
            memberExpiresAt: data.memberExpiresAt || state.auth.user.memberExpiresAt || null,
          };
        }
        return true;
      }
      showPrintPermissionDialog(data);
      return false;
    } catch {
      showPrintPermissionDialog({});
      return false;
    }
  }

  function runPrintEntry(el) {
    if (el.dataset.nav === "print-select") {
      routeTo("print-select", JSON.parse(el.dataset.params || "{}"));
      return;
    }
    if (el.dataset.openPrint) {
      const tiku = JSON.parse(el.dataset.openPrint);
      routeTo("print-preview", {
        tiku: encodeURIComponent(JSON.stringify(tiku)),
        docid: -1,
        printcount: 20,
        byid: 2,
        pagenum: -1,
      });
      return;
    }
    if (el.dataset.answerAction === "skip-print") {
      const session = state.practiceSession;
      if (!session) return;
      routeTo("print-preview", {
        tiku: encodeURIComponent(JSON.stringify(session.tiku)),
        docid: session.docId,
        printcount: -1,
        byid: 2,
        pagenum: -1,
      });
      return;
    }
    if (el.dataset.printAction) {
      handlePrintAction(el.dataset.printAction);
      return;
    }
    if (el.dataset.twentyfourAction) {
      handle24Action(el.dataset.twentyfourAction);
      return;
    }
    if (el.dataset.twentyfourPreviewAction) {
      handleTwentyfourPreviewAction(el.dataset.twentyfourPreviewAction);
    }
  }

  async function readJsonResponse(response) {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function showPrintPermissionDialog(data) {
    const existing = document.querySelector(".permission-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "permission-modal no-print";
    overlay.innerHTML = `
      <div class="permission-dialog">
        <button class="permission-close" type="button" aria-label="关闭">×</button>
        <h2>开通打印权限</h2>
        <p>当前账号暂未开通打印权限。请添加微信 <strong>${escapeHtml(data.wechat || "xixifresher")}</strong>，备注账号后开通。</p>
        <img src="${escapeAttr(data.image || "/images/image.jpg")}" alt="微信二维码" />
      </div>
    `;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest(".permission-close")) {
        overlay.remove();
      }
    });
    document.body.appendChild(overlay);
  }

  function renderHome() {
    const stars = state.homeStats.localStars.reduce((sum, item) => sum + Number(item.stars || 0), 0);
    const user = state.auth.user || null;
    const isMember = userHasActiveMembership(user);
    return `
      <div class="hero">
        <section class="hero-banner">
          <div class="kpis">
            <div class="kpi">
              <strong>${state.homeStats.localStars.length}</strong>
              <span>本地已记录题库</span>
            </div>
            <div class="kpi">
              <strong>${stars}</strong>
              <span>累计星级</span>
            </div>
            <div class="kpi">
              <strong>${state.version ? state.version.length : 0}</strong>
              <span>版本项</span>
            </div>
            <div class="kpi">
              <strong>${escapeHtml(state.homeStats.nickname || "未设置")}</strong>
              <span>奖状昵称</span>
            </div>
          </div>
        </section>
        ${isMember ? renderMemberBanner(user) : ""}
        <section class="card">
          <div class="section-head">
            <h2>入口</h2>
          </div>
          <div class="grid cards">
            ${homeCard("在线口算", "按年级或题型拉取题库，进入答题、错题重做和结果页。", "practice-select")}
            ${homeCard("打印练习", "可调整题量、版式和页面文案；在线打印与保存 PDF 需会员有效期内。", "print-select")}
            ${homeCard("24 点", "保留原始四数运算玩法，并支持在线打印与保存 PDF。", "twentyfour", {
              mode: 1,
              small_rate: 10,
              big_rate: 20,
              itemid: 1,
              timuid: -1,
              count: 5,
            })}
          </div>
        </section>
      </div>
    `;
  }

  function renderMemberBanner(user) {
    return `
      <section class="card member-banner">
        <div class="section-head">
          <div>
            <h2>会员信息</h2>
            <p class="muted">当前账号在会员有效期内，可使用在线打印和保存 PDF。</p>
          </div>
        </div>
        <div class="member-expiry-row">
          <span class="chip active">会员有效期至</span>
          <strong>${escapeHtml(formatMemberExpiresAt(user.memberExpiresAt))}</strong>
        </div>
      </section>
    `;
  }

  function isPrintEntry(el) {
    return (
      Boolean(el.dataset.openPrint) ||
      Boolean(el.dataset.printAction) ||
      el.dataset.answerAction === "skip-print" ||
      el.dataset.twentyfourAction === "print-online" ||
      el.dataset.twentyfourAction === "save-pdf" ||
      el.dataset.twentyfourPreviewAction === "print" ||
      el.dataset.twentyfourPreviewAction === "pdf"
    );
  }

  async function ensurePrintPermission() {
    if (userHasActiveMembership(state.auth.user)) {
      return true;
    }
    try {
      const response = await fetch("/api/auth/print-permission");
      const data = await readJsonResponse(response);
      if (data.canPrint || data.isMember) {
        if (state.auth.user) {
          state.auth.user = {
            ...state.auth.user,
            canPrint: true,
            isMember: true,
            memberExpiresAt: data.memberExpiresAt || state.auth.user.memberExpiresAt || null,
          };
        }
        return true;
      }
      showPrintPermissionDialog(data);
      return false;
    } catch {
      showPrintPermissionDialog({});
      return false;
    }
  }

  function showPrintPermissionDialog(data) {
    const existing = document.querySelector(".permission-modal");
    if (existing) existing.remove();

    const plans = Array.isArray(data.plans) && data.plans.length
      ? data.plans
      : [
          { title: "3个月", price: "29.9元" },
          { title: "1年", price: "69.9元" },
        ];
    const expiresHint =
      data && data.memberExpiresAt && !data.isMember
        ? `<p class="permission-note">当前会员已到期：${escapeHtml(formatMemberExpiresAt(data.memberExpiresAt))}</p>`
        : `<p class="permission-note">在线打印和保存 PDF 需要会员有效期内。</p>`;

    const overlay = document.createElement("div");
    overlay.className = "permission-modal no-print";
    overlay.innerHTML = `
      <div class="permission-dialog">
        <button class="permission-close" type="button" aria-label="关闭">×</button>
        <h2>开通会员后可打印</h2>
        <div class="permission-meta">
          <p>请添加微信 <strong>${escapeHtml(data.wechat || "refresh_dd")}</strong>，备注账号后我来手动开通会员。</p>
          ${expiresHint}
        </div>
        <div class="permission-prices">
          ${plans
            .map(
              (item) => `
                <div class="permission-price">
                  <span>${escapeHtml(item.title || "")}</span>
                  <strong>${escapeHtml(item.price || "")}</strong>
                </div>
              `
            )
            .join("")}
        </div>
        <img src="${escapeAttr(data.image || "/images/image.png")}" alt="微信二维码" />
      </div>
    `;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest(".permission-close")) {
        overlay.remove();
      }
    });
    document.body.appendChild(overlay);
  }

  function userHasActiveMembership(user) {
    return Boolean(user && parseMemberExpiresAt(user.memberExpiresAt) && parseMemberExpiresAt(user.memberExpiresAt).getTime() >= Date.now());
  }

  function formatMemberExpiresAt(value) {
    const date = parseMemberExpiresAt(value);
    if (!date) return "未开通";
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .format(date)
        .replace(/\//g, "-");
    } catch {
      return String(value).replace("T", " ").replace(/(\.\d+)?(Z|[+-]\d{2}:\d{2})$/, "");
    }
  }

  function parseMemberExpiresAt(value) {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return new Date(`${text}T23:59:59+08:00`);
    }
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) {
      return new Date(text.replace(" ", "T") + ":00+08:00");
    }
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) {
      return new Date(text.replace(" ", "T") + "+08:00");
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
})();
