# Support Functions

The backtesting engine is built from parts you can also use on their own, without running a backtest. Each works without an OpenAlgo server unless you ask it to fetch from one.

| Module | What it is for |
|---|---|
| [Session Calendar](calendar.md) (`openalgo.backtest.calendar`) | Trading days, session hours, holidays and the default intraday times of every OpenAlgo exchange, dated and sourced |
| [Cost Calculator](cost-calculator.md) (`openalgo.backtest.costs`) | The full charges of an Indian trade or round trip on any date, under any brokerage preset |
| [Instruments and Reference Data](reference-data.md) (`openalgo.backtest.reference`) | Symbols, lot sizes, freeze quantities, strike steps, tick sizes and expiries of futures and options, by date |
| [Resampling](resampling.md) (`openalgo.backtest.resample`) | Building 5-minute, hourly, daily, weekly or monthly bars on the session lattice, as Historify does |
| [Data Loading](data-loading.md) (`openalgo.backtest.data`) | Loading bars from your OpenAlgo server or your own files, checked and cached |
| [Metrics](metrics.md) (`openalgo.backtest.metrics`) | Performance figures and the HTML tearsheet for any equity curve |

Like the rest of the engine, these modules are an unreleased preview: available in the next SDK release, with an interface that may still change before the backtest beta. `import openalgo` does not load them, and importing them makes no network call.
