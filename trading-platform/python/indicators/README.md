# Indicators

## OpenAlgo Technical Indicators Library

OpenAlgo Technical Indicators is a high-performance Python library designed for comprehensive technical analysis with a focus on speed, accuracy, and ease of use. It exposes 128 indicators and helper functions across all major categories through a single `ta` object (127 in SDK 2.0.5; SDK 2.1.0 adds `ta.rvi_volatility`).

The indicator math runs in a compiled Rust core (`openalgo._oaindicators`) reached through `openalgo.indicators`. There is no JIT warm-up and no first-call compilation pause: the first call is as fast as the thousandth. `numba` and `llvmlite` are no longer dependencies; `openalgo.numba_shim` only survives so that legacy `from openalgo.numba_shim import jit` imports keep working, and its decorators are no-ops.

Every function accepts a NumPy array, a pandas Series or a plain list. The indicators return the same container type they were given, so a pandas Series in means a pandas Series out with the original index preserved. The thirteen signal helpers (`crossover`, `crossunder`, `cross`, `highest`, `lowest`, `change`, `roc`, `stdev`, `rising`, `falling`, `exrem`, `flip`, `valuewhen`) are the exception: they always return a plain NumPy array. Wrap them in `pd.Series(result, index=df.index)` if you need index alignment or `.iloc` access.

### Import Statement

```python
from openalgo import ta
```

To see the full list at runtime:

<!-- runnable -->
```python
from openalgo import ta

names = [n for n in dir(ta) if not n.startswith('_')]
print(len(names))
print(sorted(names)[:6])
```

<!-- output -->
```text
128
['accelerator_oscillator', 'adl', 'adx', 'adxr', 'alligator', 'alma']
```

The count is 128 from SDK 2.1.0 and 127 in SDK 2.0.5.

### List of Supported Indicators

### Trend Indicators

* **SMA** - Simple Moving Average
* **EMA** - Exponential Moving Average
* **WMA** - Weighted Moving Average
* **DEMA** - Double Exponential Moving Average
* **TEMA** - Triple Exponential Moving Average
* **HMA** - Hull Moving Average
* **VWMA** - Volume Weighted Moving Average
* **ALMA** - Arnaud Legoux Moving Average
* **KAMA** - Kaufman's Adaptive Moving Average
* **ZLEMA** - Zero Lag Exponential Moving Average
* **T3** - T3 Moving Average
* **FRAMA** - Fractal Adaptive Moving Average
* **TRIMA** - Triangular Moving Average
* **McGinley** - McGinley Dynamic
* **VIDYA** - Variable Index Dynamic Average
* **Alligator** - Bill Williams Alligator
* **MovingAverageEnvelopes** - Moving Average Envelopes
* **Supertrend** - Supertrend Indicator
* **Ichimoku** - Ichimoku Cloud
* **ChandeKrollStop** - Chande Kroll Stop

### Momentum Indicators

* **RSI** - Relative Strength Index
* **MACD** - Moving Average Convergence Divergence
* **Stochastic** - Stochastic Oscillator
* **CCI** - Commodity Channel Index
* **WilliamsR** - Williams %R
* **BOP** - Balance of Power
* **ElderRay** - Elder Ray Index (Bull/Bear Power)
* **Fisher** - Fisher Transform
* **CRSI** - Connors RSI
* **MOM** - Momentum (`ta.mom`)
* **APO** - Absolute Price Oscillator (`ta.apo`)
* **ROCP** - Rate of Change Percentage (`ta.rocp`)
* **ROCR** - Rate of Change Ratio (`ta.rocr`)
* **ROCR100** - Rate of Change Ratio x 100 (`ta.rocr100`)
* **STOCHF** - Fast Stochastic (`ta.stochf`)

### Volatility Indicators

* **ATR** - Average True Range
* **BollingerBands** - Bollinger Bands
* **Keltner** - Keltner Channel
* **Donchian** - Donchian Channel
* **Chaikin** - Chaikin Volatility
* **NATR** - Normalized Average True Range
* **ULTOSC** - Ultimate Oscillator
* **TRANGE** - True Range
* **MASS** - Mass Index
* **BBPercent** - Bollinger Bands %B
* **BBWidth** - Bollinger Bandwidth
* **ChandelierExit** - Chandelier Exit
* **HistoricalVolatility** - Historical Volatility
* **UlcerIndex** - Ulcer Index
* **STARC** - STARC Bands
* **RVI Volatility** - Relative Volatility Index (`ta.rvi_volatility`, from SDK 2.1.0)

### Volume Indicators

* **OBV** - On Balance Volume
* **OBVSmoothed** - On Balance Volume with Smoothing
* **VWAP** - Volume Weighted Average Price
* **MFI** - Money Flow Index
* **ADL** - Accumulation/Distribution Line
* **CMF** - Chaikin Money Flow
* **EMV** - Ease of Movement
* **FI** - Elder Force Index
* **NVI** - Negative Volume Index
* **NVI with EMA** - Negative Volume Index plus EMA signal line (`ta.nvi_with_ema`)
* **PVI** - Positive Volume Index
* **PVI with Signal** - Positive Volume Index plus signal line (`ta.pvi_with_signal`)
* **VOLOSC** - Volume Oscillator
* **VROC** - Volume Rate of Change
* **KlingerVolumeOscillator** - Klinger Volume Oscillator
* **PriceVolumeTrend** - Price Volume Trend
* **RVOL** - Relative Volume

### Oscillators

* **ROC** - Rate of Change
* **CMO** - Chande Momentum Oscillator
* **TRIX** - Triple Exponential Average
* **UO** - Ultimate Oscillator
* **AO** - Awesome Oscillator
* **AC** - Accelerator Oscillator
* **PPO** - Percentage Price Oscillator
* **PO** - Price Oscillator
* **DPO** - Detrended Price Oscillator
* **AROONOSC** - Aroon Oscillator
* **StochRSI** - Stochastic RSI
* **RVI** - Relative Vigor Index (`ta.rvi`). The Relative Volatility Index is a separate function, `ta.rvi_volatility`, from SDK 2.1.0
* **CHO** - Chaikin Oscillator
* **CHOP** - Choppiness Index
* **KST** - Know Sure Thing
* **TSI** - True Strength Index
* **VI** - Vortex Indicator
* **STC** - Schaff Trend Cycle
* **GatorOscillator** - Gator Oscillator
* **Coppock** - Coppock Curve

### Statistical Indicators

* **LINREG** - Linear Regression
* **LRSLOPE** - Linear Regression Slope
* **CORREL** - Pearson Correlation Coefficient
* **BETA** - Beta Coefficient
* **VAR** - Variance
* **TSF** - Time Series Forecast
* **MEDIAN** - Rolling Median
* **MedianBands** - Median with Bands
* **MODE** - Rolling Mode
* **LINEARREG\_ANGLE** - Linear Regression Angle (`ta.linregangle`)
* **LINEARREG\_INTERCEPT** - Linear Regression Intercept (`ta.linregintercept`)

### Hybrid Indicators

* **ADX** - Average Directional Index
* **Aroon** - Aroon Indicator
* **PivotPoints** - Pivot Points
* **SAR** - Parabolic SAR
* **DMI** - Directional Movement Index
* **WilliamsFractals** - Williams Fractals
* **RWI** - Random Walk Index
* **PLUS\_DM** - Plus Directional Movement (`ta.plus_dm`)
* **MINUS\_DM** - Minus Directional Movement (`ta.minus_dm`)
* **DX** - Directional Movement Index value (`ta.dx`)
* **ADXR** - Average Directional Movement Rating (`ta.adxr`)

### Utility Functions

* **crossover** - Series crossover detection
* **crossunder** - Series crossunder detection
* **highest** - Highest value over period
* **lowest** - Lowest value over period
* **change** - Change in value
* **roc** - Rate of change
* **stdev** - Standard deviation
* **exrem** - Excess removal
* **flip** - Flip function
* **valuewhen** - Value when condition
* **rising** - Rising detection
* **falling** - Falling detection
* **cross** - Cross detection (both directions)
* **midpoint** - Midpoint of the highest and lowest value over a period
* **midprice** - Midpoint of the highest high and lowest low over a period
* **medprice** - Median price, (high + low) / 2
* **typprice** - Typical price, (high + low + close) / 3
* **wclprice** - Weighted close price, (high + low + close x 2) / 4
* **avgprice** - Average price, (open + high + low + close) / 4

### Indicators that look ahead (the causality registry)

An indicator output is **causal** when its value on a bar uses only that bar and the bars before it. A causal value never changes once its bar has closed, so it can be used as a signal on that bar. A few outputs are drawn on a bar but decided by later bars: fine on a chart, wrong in a backtest, because a strategy reading them on that bar is reading the future.

From SDK 2.1.0, `openalgo.indicators.causality` says which outputs those are, with one row for every `ta` function:

| Function | Returns |
|---|---|
| `causality.is_causal(name, output=None)` | True when the output (by name or position) uses only bars up to the current one; with no output, True only when every output does. `name` may also be the function itself, such as `ta.ichimoku` |
| `causality.non_causal()` | Every `ta` output that looks ahead, as `{function: (outputs, ...)}` |
| `causality.outputs(name)` | The names of a function's outputs, in the order it returns them |
| `causality.causality(name=None)` | The registry as plain data, with the reason each look-ahead output looks ahead and notes such as "anchored" |

The outputs that look ahead are both outputs of `ta.fractals` (a fractal is confirmed only bars later), the lagging span of `ta.ichimoku` (the close plotted back in time), and the `ZigZag` indicator class, which has no `ta` function. The table is checked by a test that computes every function on a full series and again on the series cut short: a causal output must give the same values up to the cut.

<!-- runnable -->
```python
from openalgo import ta
from openalgo.indicators import causality

print(causality.non_causal())
print(causality.is_causal("rsi"), causality.is_causal("ichimoku"), causality.is_causal("ichimoku", "conversion_line"))
print(causality.is_causal(ta.fractals), causality.outputs("macd"))
print(causality.causality("ichimoku")["non_causal"]["lagging_span"])
```

<!-- output -->
```text
{'fractals': ('fractal_up', 'fractal_down'), 'ichimoku': ('lagging_span',)}
True False True
False ('macd', 'signal', 'histogram')
the close plotted displacement - 1 bars back: the value on bar t is the close of bar t + displacement - 1
```

Two things a `True` does not say: a recursive indicator (EMA, RSI, ATR) is causal but needs warm-up bars before its values stop depending on where the series started, and a causal value on a bar is known when that bar closes, not before.

The [backtesting engine](../backtesting/README.md) uses this registry: `self.I` refuses an indicator whose outputs all look ahead and raises an error the moment a strategy uses a look-ahead output, then checks every other indicator on the run's own data before the first bar (see [indicators and look-ahead checks](../backtesting/writing-strategies.md#why-was-my-indicator-refused)).

### Changes in SDK 2.1.0

SDK 2.1.0 changes some results. Series without NaN values give the same values as SDK 2.0.5 except where noted.

**Results that change on clean data**

* **`ta.vwap` honours `anchor`.** It restarts every anchor period (`"Session"` by default) when the bar times are known: a pandas Series indexed by dates, or `timestamps=`. Pass `anchor=None` for the 2.0.5 result. On daily, weekly or monthly bars every bar is its own session and a warning says so. An unknown anchor raises `ValueError`, and zero volume no longer raises `RuntimeError`. See [VWAP](volume.md#volume-weighted-average-price-vwap).
* **`ta.psar`** starts the stop of an outside bar that reverses the trend at that bar's extreme, clamped to the two previous bars, and a bar that only touches the stop no longer reverses. See [Parabolic SAR](hybrid.md#parabolic-sar).
* **The `RVI` class** in `openalgo.indicators.volatility` computes the published Relative Volatility Index (2.0.5 took an RSI of the standard deviation). It is reached as `ta.rvi_volatility`; `ta.rvi`, the Relative Vigor Index, does not change.
* **Invalid helper arguments:** a negative length in `change`, `rising` and `falling` raises `ValueError` (2.0.5 raised `IndexError`); `highest` and `lowest` with a period of 0, and `valuewhen` with `n` below 1, return all NaN.

**Results that change only around NaN input.** A rolling window is NaN while it holds a NaN, and a recursive indicator carries its state across a NaN bar:

* `cmf`, `mfi`, `cmo`, `rvi`, `highest`, `lowest`: only NaN positions move.
* `fisher`, `frama`, `psar`, `vwap`: NaN while a NaN is in the window, then they recover (2.0.5 stayed NaN to the end of the series).
* `dema`, `tema`: only the NaN bar is NaN. In 2.0.5, `tema` dropped NaN bars before its third average, so values after a gap depended on later bars. See [Trend](trend.md) (DEMA and TEMA).

**New**

* `ta.rvi_volatility(data, stdev_period=10, rsi_period=14)`: the [Relative Volatility Index](volatility.md#relative-volatility-index-rvi-volatility).
* `ta.psar(..., return_trend=True)` also returns the trend, `+1` long and `-1` short.
* `ta.vwap(..., timestamps=None, session_starts=None)` and `ta.pivot_points(..., anchor=None, timestamps=None)`: bar times for plain arrays, and `pivot_points(anchor="D")` (or `"Week"`, `"Month"`) for the previous completed period's levels on every bar. See [Pivot Points](hybrid.md#pivot-points).
* `openalgo.indicators.causality`, described above.

**Fixed**

* `ta.highest` and `ta.lowest` with a period far larger than the series could abort Python while allocating memory; they now return NaN.
* `ta.ulcerindex` returned NaN instead of 0 where rounding left the average of squared drawdowns a hair below zero.
* Without the compiled extension, `fisher`, `cmf`, `mfi`, `psar`, `cmo` and `frama` raised an error; they now compute with NumPy, and `stochastic` returns one value per bar on short input.
* The crossover helpers (`crossover`, `crossunder`, `cross`, `valuewhen` and the others) run in the Rust core, about 100 times faster.

### Perfect For

* **Quantitative Analysts** building trading strategies
* **Financial Engineers** developing risk management systems
* **Algorithmic Traders** requiring fast, reliable technical analysis
* **Research Teams** conducting market analysis and backtesting
* **Financial Applications** needing embedded technical analysis capabilities

OpenAlgo Indicators bridges the gap between ease of use and performance, making sophisticated technical analysis accessible to both beginners and experts while maintaining the speed and accuracy demanded by professional trading systems.
