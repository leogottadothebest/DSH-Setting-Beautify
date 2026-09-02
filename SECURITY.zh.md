# 安全政策

## 范围

`dsh-settings-beautify` 是一个纯外观（cosmetic）客户端插件。其运行时行为仅包括：

- 注入一张样式表（`<style id="dsh-settings-beautify-styles">`），仅通过 `data-dshb-*` 属性重绘设置面板；
- 观察 DOM（MutationObserver）并为结构角色打上 `data-dshb-*` 属性；
- 注册“美化 / Beautify”设置页；偏好仅保存在浏览器 `localStorage` 的 `dsh-settings-beautify:prefs` 键下。

插件**不发起任何网络请求**、**不声明任何主机 API**、**不读写任何文件**，也**不执行远程代码**。运行时无第三方依赖。

## 报告漏洞

请**不要**就安全问题提交公开 issue。请私下联系维护者：

- 通过 GitHub 仓库的 [Security Advisories](https://github.com/leogottadothebest/dsh-settings-beautify/security/advisories) 页面提交私有报告，或
- 邮件联系维护者（地址见仓库描述）。

我们会在 3 个工作日内确认收到。请附上：

1. DSH Desktop 版本与平台；
2. 插件版本；
3. 复现步骤；
4. 影响评估（如已知）。

## 受支持版本

| 版本 | 支持状态 |
| ---- | -------- |
| 0.1.x | :white_check_mark: 支持 |
| < 0.1 | :x: 不支持 |

## 给下游使用者的说明

- 插件属于 UI 主题；请像对待任何其他 DSH 插件一样将其视为不可信代码。安装前请审阅源码（代码量小且可读）。
- 偏好保存在 `localStorage`，不会跨 Profile 同步。
