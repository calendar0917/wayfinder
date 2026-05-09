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

### AI 配置（可选）

```bash
# 在 .env.local 中添加
WAYFINDER_API_KEY=sk-your-api-key
WAYFINDER_API_BASE=https://api.openai.com/v1
WAYFINDER_AI_MODEL=gpt-4o
```

更详细的配置说明请参阅 [README](https://github.com/calendar0917/wayfinder/blob/main/README.md)。
