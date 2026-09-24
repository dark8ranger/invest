# invest

纯前端市场 K 线看板，无需安装依赖、后端服务或 API 密钥。

直接使用浏览器打开 `index.html`，也可以部署到任意静态网页托管服务。

- 指数基金：SPY（跟踪标普 500）、QQQ（跟踪纳斯达克 100）。展示 ETF 份额价格，不是指数点位。
- 加密货币：Coinbase BTC/USD、ETH/USD。
- 四张蜡烛图，支持统一切换小时、日、周、月周期，以及图表内的缩放和周期选择。
- 响应式布局：桌面双列、手机单列。

图表通过 TradingView 官方 Advanced Chart 嵌入组件加载，必须联网，部分行情可能延迟。第三方服务不可用或被网络拦截时，可使用查看行情链接。网页不包含模拟价格，不存储个人数据，也不提供交易操作。

组件文档：https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/
