# ReactDemo Docker 启动说明

## 一键命令

```bash
npm run dev:docker
```

启动开发模式容器（支持代码热更新）：
- 页面地址: http://localhost:3001
- 数据库端口: 5433
- 请确认访问的是 3001，而不是生产端口 3000
- 首次启动完成后再开始改代码，保存后会自动热更新
- 本地 .env 已对齐开发库端口 5433，避免热更新进程连到 5432
- 首次可执行 `Copy-Item app/.env.example app/.env`

```bash
npm run prod:docker
```

启动生产模式容器：
- 页面地址: http://localhost:3000
- 数据库端口: 5432

## 常用辅助命令

```bash
npm run dev:docker:logs
npm run dev:docker:down
```

```bash
npm run prod:docker:logs
npm run prod:docker:down
```

## ECS 一键部署

在 ECS 上拉取项目到 `/opt/reactdemo` 后执行：

```bash
cd /opt/reactdemo
sudo bash deploy/ecs-init.sh your-domain.com your-email@example.com /opt/reactdemo
```

发布更新：

```bash
cd /opt/reactdemo
sudo bash deploy/ecs-release.sh /opt/reactdemo main
```

部署脚本文件：
- `deploy/ecs-init.sh`
- `deploy/ecs-release.sh`
- `deploy/nginx.reactdemo.conf`
