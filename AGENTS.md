# DSH 项目自动提交规则(DSH-Setting-Beautify)

本文件由 DSH 在每个会话启动时读取,适用于本仓库(DSH-Setting-Beautify)的**所有会话/对话**。

## 硬性规则

当会话工作区为本仓库(即 `/Users/leo/Documents/DeepSeekHarness/DSH-Beautify` 或其子目录)时,必须遵守以下规则:

1. **每次**对仓库内任何文件做出修改/新增/删除后,**在回合结束前**执行:
   `git add -A` → `git commit -m "<具体描述>"` → `git push origin main`。
2. 在回复中**明确反馈当前提交版本**:短哈希 + 完整哈希 + 提交信息,并确认本地与 `origin/main` 同步、工作区干净。
3. 未发生任何改动时无需提交,但需说明"无改动,未提交"。
4. 严禁提交密钥、token、私密 URL。

## 适用范围

此规则只约束本仓库(DSH-Setting-Beautify);其他项目不受影响,除非各仓库有自己的 AGENTS.md。
