---
title: 快速开始
---

## 快速开始

```bash
git clone https://github.com/calendar0917/wayfinder.git
cd wayfinder
cp .env.example .env.local
cp data/settings.example.yaml data/settings.yaml
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env.local
docker compose up -d
```

打开 `http://localhost:3000`，通过设置对话框或 AI 对话设置密码。

### 环境变量说明

| 变量 | 说明 |
|------|------|
| `AUTH_SECRET` | Cookie 签名密钥（签名登录 Cookie，不是登录密码），必填 |
| `WAYFINDER_API_KEY` | AI 服务 API Key，可选，也可在页面设置 |
| `WAYFINDER_API_BASE` | AI 服务 API 地址，可选，也可在页面设置 |
| `WAYFINDER_AI_MODEL` | AI 模型名称，可选，也可在页面设置 |
| `WAYFINDER_PASSWORD_HASH` | 登录密码的 bcrypt 哈希，留空则默认密码为 admin |

> 环境变量仅作为初始默认值，在页面设置中修改后会保存到配置文件，重启后仍然有效。

更详细的配置说明请参阅 [README](https://github.com/calendar0917/wayfinder/blob/main/README.md)。
