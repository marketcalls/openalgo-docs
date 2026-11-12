# Walk-Forward

{% hint style="info" %}
**Planned.** Walk-forward optimization (`bt.walk_forward`) is part of the design of the backtesting engine but is not in the SDK yet. Calling it today raises `NotImplementedError`. This page will describe it when it lands.
{% endhint %}

Walk-forward testing guards against choosing parameters that only fit the past. It will split your history into consecutive windows, optimize the strategy on each training window, and then test the chosen parameters on the period that follows it, which the optimization never saw. Joining those out-of-sample periods gives one equity curve that shows how the strategy would have done had you re-optimized it as you went.

Until then, you can do a manual version with [Optimization](optimization.md): sweep one period, then run `bt.backtest` with the best parameters on a later period.
