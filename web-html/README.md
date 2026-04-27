# Web 版说明

这个目录是把当前微信小程序改成 `HTML + JS + CSS` 的浏览器版本。

## 文件

- `index.html`: 入口页面
- `styles.css`: 页面样式
- `app.js`: 单页应用逻辑，覆盖首页、在线口算、打印练习、24 点、文章页、反馈页
- `server.js`: 本地静态服务 + 远程接口代理，解决浏览器 CORS

## 运行

不要直接双击 `index.html`，也不要再用纯静态服务器。

请直接启动本地代理服务：

```powershell
cd web-html
node server.js
```

然后访问 `http://127.0.0.1:8080`。

也可以直接双击：

```text
web-html\start-web.bat
```

它会启动本地服务，并打开浏览器到正确地址。

## 说明

- 当前实现保留了原项目的远程接口调用方式，题库、打印配置、24 点题目仍然从 `xiaoxuestudy.com` 拉取。
- `server.js` 会把前端的 `/api/...` 请求代理到远端接口，因此浏览器不再直接跨域访问第三方站点。
- 浏览器打印使用 `window.print()`；服务端 PDF 下载入口也通过本地代理转发。
