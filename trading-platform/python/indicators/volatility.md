# Volatility

Volatility indicators measure the degree of price variation in financial instruments. They help traders assess market uncertainty, risk levels, and potential breakout conditions. OpenAlgo provides a comprehensive collection of volatility indicators optimized for performance and accuracy.

### Import Statement

```python
from openalgo import ta
from openalgo import api

# Initialize API client
client = api(api_key='your_api_key_here', host='http://127.0.0.1:5000')

# Get sample data
df = client.history(symbol="SBIN", exchange="NSE", interval="5m", 
                   start_date="2025-04-01", end_date="2025-04-08")
```

### Available Volatility Indicators

***

### Average True Range (ATR)

ATR measures market volatility by decomposing the entire range of an asset price for that period. It's one of the most widely used volatility indicators.

#### Usage

```python
atr_result = ta.atr(high, low, close, period=14)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=14)_: Number of periods for ATR calculation

#### Returns

* **array**: ATR values in the same format as input

#### Example

```python
# Calculate 14-period ATR
atr_14 = ta.atr(df['high'], df['low'], df['close'], period=14)
df['ATR_14'] = atr_14

# Calculate 21-period ATR
atr_21 = ta.atr(df['high'], df['low'], df['close'], period=21)
df['ATR_21'] = atr_21

print(df[['close', 'ATR_14', 'ATR_21']].tail())
```

***

### Bollinger Bands

Bollinger Bands consist of a middle band (SMA) and two outer bands that are standard deviations away from the middle band, used to identify overbought and oversold conditions.

#### Usage

```python
upper, middle, lower = ta.bbands(data, period=20, std_dev=2.0)
```

#### Parameters

* **data** _(array-like)_: Price data (typically closing prices)
* **period** _(int, default=20)_: Number of periods for moving average and standard deviation
* **std\_dev** _(float, default=2.0)_: Number of standard deviations for the bands

#### Returns

* **tuple**: (upper\_band, middle\_band, lower\_band) arrays

#### Example

```python
# Calculate Bollinger Bands
bb_upper, bb_middle, bb_lower = ta.bbands(df['close'], period=20, std_dev=2.0)
df['BB_Upper'] = bb_upper
df['BB_Middle'] = bb_middle
df['BB_Lower'] = bb_lower

# Calculate tighter bands
bb_upper_tight, bb_middle_tight, bb_lower_tight = ta.bbands(df['close'], period=20, std_dev=1.5)
df['BB_Upper_Tight'] = bb_upper_tight
df['BB_Lower_Tight'] = bb_lower_tight

print(df[['close', 'BB_Upper', 'BB_Middle', 'BB_Lower']].tail())
```

***

### Keltner Channel

Keltner Channels are volatility-based envelopes set above and below an exponential moving average, using ATR to set channel distance.

#### Usage

```python
upper, middle, lower = ta.keltner(high, low, close, ema_period=20, atr_period=10, multiplier=2.0)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **ema\_period** _(int, default=20)_: Period for the EMA calculation
* **atr\_period** _(int, default=10)_: Period for the ATR calculation
* **multiplier** _(float, default=2.0)_: Multiplier for the ATR

#### Returns

* **tuple**: (upper\_channel, middle\_line, lower\_channel) arrays

#### Example

```python
# Calculate Keltner Channel
kc_upper, kc_middle, kc_lower = ta.keltner(df['high'], df['low'], df['close'])
df['KC_Upper'] = kc_upper
df['KC_Middle'] = kc_middle
df['KC_Lower'] = kc_lower

# Custom parameters
kc_upper_custom, kc_middle_custom, kc_lower_custom = ta.keltner(
    df['high'], df['low'], df['close'], 
    ema_period=14, atr_period=14, multiplier=1.5
)

print(df[['close', 'KC_Upper', 'KC_Middle', 'KC_Lower']].tail())
```

***

### Donchian Channel

Donchian Channels are formed by taking the highest high and lowest low of the last n periods, providing dynamic support and resistance levels.

#### Usage

```python
upper, middle, lower = ta.donchian(high, low, period=20)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **period** _(int, default=20)_: Number of periods for the channel calculation

#### Returns

* **tuple**: (upper\_channel, middle\_line, lower\_channel) arrays

#### Example

```python
# Calculate Donchian Channel
dc_upper, dc_middle, dc_lower = ta.donchian(df['high'], df['low'], period=20)
df['DC_Upper'] = dc_upper
df['DC_Middle'] = dc_middle
df['DC_Lower'] = dc_lower

# Different periods
dc_upper_10, dc_middle_10, dc_lower_10 = ta.donchian(df['high'], df['low'], period=10)
df['DC_Upper_10'] = dc_upper_10
df['DC_Lower_10'] = dc_lower_10

print(df[['high', 'low', 'DC_Upper', 'DC_Middle', 'DC_Lower']].tail())
```

***

### Chaikin Volatility

Chaikin Volatility measures the rate of change of the trading range, indicating periods of increasing or decreasing volatility.

#### Usage

```python
cv_result = ta.chaikin(high, low, ema_period=10, roc_period=10)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **ema\_period** _(int, default=10)_: Period for EMA of high-low range
* **roc\_period** _(int, default=10)_: Period for rate of change calculation

#### Returns

* **array**: Chaikin Volatility values

#### Example

```python
# Calculate Chaikin Volatility
cv = ta.chaikin(df['high'], df['low'])
df['Chaikin_Volatility'] = cv

# Custom parameters
cv_custom = ta.chaikin(df['high'], df['low'], ema_period=14, roc_period=14)
df['CV_Custom'] = cv_custom

print(df[['close', 'Chaikin_Volatility', 'CV_Custom']].tail())
```

***

### Normalized Average True Range (NATR)

NATR is ATR expressed as a percentage of closing price, making it useful for comparing volatility across different price levels.

#### Usage

```python
natr_result = ta.natr(high, low, close, period=14)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=14)_: Period for ATR calculation

#### Returns

* **array**: NATR values (percentage)

#### Example

```python
# Calculate NATR
natr = ta.natr(df['high'], df['low'], df['close'], period=14)
df['NATR'] = natr

# Different period
natr_21 = ta.natr(df['high'], df['low'], df['close'], period=21)
df['NATR_21'] = natr_21

print(df[['close', 'NATR', 'NATR_21']].tail())
```

***

### Relative Vigor Index (RVI)

`ta.rvi` is the Relative Vigor Index. It compares the close-open range with the high-low range to gauge the conviction behind a move, and returns the RVI line together with its signal line.

{% hint style="warning" %}
`ta.rvi` needs four price series (open, high, low, close) and returns a tuple. It is not the Relative Volatility Index: from the next SDK release that is `ta.rvi_volatility` (below), which takes one price series. In SDK 2.0.5 the Relative Volatility Index is not exposed on the `ta` object.
{% endhint %}

#### Usage

```python
rvi_line, rvi_signal = ta.rvi(open_prices, high, low, close, period=10)
```

#### Parameters

* **open\_prices** _(array-like)_: Opening prices
* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=10)_: Lookback period

#### Returns

* **tuple**: (rvi, signal) in the same format as input

#### Example

```python
# Calculate RVI and its signal line
rvi, rvi_signal = ta.rvi(df['open'], df['high'], df['low'], df['close'])
df['RVI'] = rvi
df['RVI_Signal'] = rvi_signal

# Custom period
rvi_custom, rvi_signal_custom = ta.rvi(df['open'], df['high'], df['low'], df['close'], period=14)
df['RVI_Custom'] = rvi_custom

print(df[['close', 'RVI', 'RVI_Signal', 'RVI_Custom']].tail())
```

***

### Relative Volatility Index (RVI Volatility)

`ta.rvi_volatility` is the Relative Volatility Index of Donald Dorsey (1993), available from the next SDK release. It works like the RSI, but on volatility instead of price changes: it measures the share of recent volatility that fell on rising bars. Values run from 0 to 100; above 50 means more of the volatility came on up bars.

How it is calculated: the rolling standard deviation of the price over `stdev_period` bars counts on the up side on a bar that closes above the bar before, and on the down side on a bar that closes below it. U and D are those two sides smoothed with **Wilder's smoothing over `rsi_period` bars** (the average the RSI uses, not an EMA), and RVI = 100 x U / (U + D). It is 50 when there is no volatility on either side.

#### Usage

```python
rvi_vol = ta.rvi_volatility(close, stdev_period=10, rsi_period=14)
```

#### Parameters

* **data** _(array-like)_: Price data (typically closing prices)
* **stdev\_period** _(int, default=10)_: Window, in bars, of the rolling population standard deviation
* **rsi\_period** _(int, default=14)_: Bars of Wilder's smoothing

#### Returns

* **array**: Values from 0 to 100 in the same format as input. The first value is at bar `stdev_period + rsi_period - 2` (counting from 0); a bar is NaN while a NaN is in its deviation window or on the bar before it.

{% hint style="info" %}
**From the next SDK release**, the `RVI` class in `openalgo.indicators.volatility`, which `ta.rvi_volatility` uses, computes the published Relative Volatility Index. In SDK 2.0.5 that class took an RSI of the standard deviation, so nearly every value changes. `ta.rvi` (the Relative Vigor Index) is not affected.
{% endhint %}

#### Example

<!-- runnable -->
```python
import numpy as np
import pandas as pd

from openalgo import ta

k = np.arange(60)
close = pd.Series(100 + 0.2 * k + 3 * np.sin(k / 5))  # synthetic closing prices

rvi_vol = ta.rvi_volatility(close)  # stdev_period=10, rsi_period=14
print("first value at bar", rvi_vol.first_valid_index())
print(rvi_vol.iloc[22:28].round(2).to_string())
```

<!-- output -->
```text
first value at bar 22
22    24.12
23    29.06
24    32.84
25    35.59
26    37.81
27    40.54
```

***

### Ultimate Oscillator

Ultimate Oscillator combines short, medium, and long-term price action into one oscillator, incorporating volatility analysis.

#### Usage

```python
uo_result = ta.ultimate_oscillator(high, low, close, period1=7, period2=14, period3=28)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period1** _(int, default=7)_: Short period
* **period2** _(int, default=14)_: Medium period
* **period3** _(int, default=28)_: Long period

#### Returns

* **array**: Ultimate Oscillator values (0-100 range)

#### Example

```python
# Calculate Ultimate Oscillator
uo = ta.ultimate_oscillator(df['high'], df['low'], df['close'])
df['Ultimate_Oscillator'] = uo

# Custom periods
uo_custom = ta.ultimate_oscillator(df['high'], df['low'], df['close'], 
                                  period1=5, period2=10, period3=20)
df['UO_Custom'] = uo_custom

print(df[['close', 'Ultimate_Oscillator', 'UO_Custom']].tail())
```

***

### True Range

True Range measures volatility that accounts for gaps between periods.

#### Usage

```python
tr_result = ta.true_range(high, low, close)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices

#### Returns

* **array**: True Range values

#### Example

```python
# Calculate True Range
tr = ta.true_range(df['high'], df['low'], df['close'])
df['True_Range'] = tr

print(df[['high', 'low', 'close', 'True_Range']].tail())
```

***

### Mass Index

Mass Index uses the high-low range to identify trend reversals based on range expansion.

#### Usage

```python
mass_result = ta.massindex(high, low, length=10)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **length** _(int, default=10)_: Period for sum calculation

#### Returns

* **array**: Mass Index values

#### Example

```python
# Calculate Mass Index
mass = ta.massindex(df['high'], df['low'])
df['Mass_Index'] = mass

# Different period
mass_14 = ta.massindex(df['high'], df['low'], length=14)
df['Mass_Index_14'] = mass_14

print(df[['close', 'Mass_Index', 'Mass_Index_14']].tail())
```

***

### Bollinger Bands %B

%B shows where price is in relation to the Bollinger Bands, with 1 indicating price at upper band and 0 at lower band.

#### Usage

```python
percent_b = ta.bbpercent(data, period=20, std_dev=2.0)
```

#### Parameters

* **data** _(array-like)_: Price data (typically closing prices)
* **period** _(int, default=20)_: Period for moving average and standard deviation
* **std\_dev** _(float, default=2.0)_: Number of standard deviations for the bands

#### Returns

* **array**: %B values

#### Example

```python
# Calculate Bollinger Bands %B
bb_percent = ta.bbpercent(df['close'])
df['BB_Percent_B'] = bb_percent

# Custom parameters
bb_percent_tight = ta.bbpercent(df['close'], period=14, std_dev=1.5)
df['BB_Percent_B_Tight'] = bb_percent_tight

print(df[['close', 'BB_Percent_B', 'BB_Percent_B_Tight']].tail())
```

***

### Bollinger Bandwidth

Bollinger Bandwidth measures the width of the Bollinger Bands, useful for identifying volatility squeezes.

#### Usage

```python
bandwidth = ta.bbwidth(data, period=20, std_dev=2.0)
```

#### Parameters

* **data** _(array-like)_: Price data (typically closing prices)
* **period** _(int, default=20)_: Period for moving average and standard deviation
* **std\_dev** _(float, default=2.0)_: Number of standard deviations for the bands

#### Returns

* **array**: Bandwidth values

#### Example

```python
# Calculate Bollinger Bandwidth
bb_width = ta.bbwidth(df['close'])
df['BB_Bandwidth'] = bb_width

# Different standard deviation
bb_width_tight = ta.bbwidth(df['close'], std_dev=1.5)
df['BB_Bandwidth_Tight'] = bb_width_tight

print(df[['close', 'BB_Bandwidth', 'BB_Bandwidth_Tight']].tail())
```

***

### Chandelier Exit

Chandelier Exit is a trailing stop-loss technique that follows price action using highest/lowest values and ATR.

#### Usage

```python
long_exit, short_exit = ta.chandelier_exit(high, low, close, period=22, multiplier=3.0)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=22)_: Period for highest/lowest and ATR calculation
* **multiplier** _(float, default=3.0)_: ATR multiplier

#### Returns

* **tuple**: (long\_exit, short\_exit) arrays

#### Example

```python
# Calculate Chandelier Exit
ce_long, ce_short = ta.chandelier_exit(df['high'], df['low'], df['close'])
df['CE_Long_Exit'] = ce_long
df['CE_Short_Exit'] = ce_short

# Custom parameters
ce_long_custom, ce_short_custom = ta.chandelier_exit(
    df['high'], df['low'], df['close'], period=14, multiplier=2.0
)
df['CE_Long_Custom'] = ce_long_custom
df['CE_Short_Custom'] = ce_short_custom

print(df[['close', 'CE_Long_Exit', 'CE_Short_Exit']].tail())
```

***

### Historical Volatility

Historical Volatility measures the standard deviation of logarithmic returns over a specified period.

#### Usage

```python
hv_result = ta.hv(close, length=10, annual=365, per=1)
```

#### Parameters

* **close** _(array-like)_: Closing prices
* **length** _(int, default=10)_: Period for volatility calculation
* **annual** _(int, default=365)_: Annual periods for scaling
* **per** _(int, default=1)_: Timeframe periods (1 for daily/intraday, 7 for weekly+)

#### Returns

* **array**: Historical volatility values (annualized percentages)

#### Example

```python
# Calculate Historical Volatility
hv = ta.hv(df['close'], length=20)
df['Historical_Volatility'] = hv

# Different periods
hv_10 = ta.hv(df['close'], length=10)
hv_30 = ta.hv(df['close'], length=30)
df['HV_10'] = hv_10
df['HV_30'] = hv_30

print(df[['close', 'Historical_Volatility', 'HV_10', 'HV_30']].tail())
```

***

### Ulcer Index

Ulcer Index measures downside risk by calculating the depth and duration of drawdowns from recent highs.

#### Usage

```python
ui_result = ta.ulcerindex(data, length=14, smooth_length=14, signal_length=52, 
                         signal_type="SMA", return_signal=False)
```

#### Parameters

* **data** _(array-like)_: Price data (typically closing prices)
* **length** _(int, default=14)_: Period for highest calculation
* **smooth\_length** _(int, default=14)_: Period for smoothing squared drawdowns
* **signal\_length** _(int, default=52)_: Period for signal line calculation
* **signal\_type** _(str, default="SMA")_: Signal smoothing type ("SMA" or "EMA")
* **return\_signal** _(bool, default=False)_: Whether to return signal line

#### Returns

* **array** or **tuple**: Ulcer Index values (and signal if return\_signal=True)

{% hint style="info" %}
From the next SDK release, a bar where rounding left the average of squared drawdowns a hair below zero reads 0 (no drawdown). SDK 2.0.5 returned NaN there.
{% endhint %}

#### Example

```python
# Calculate Ulcer Index
ui = ta.ulcerindex(df['close'])
df['Ulcer_Index'] = ui

# With signal line
ui_with_signal, ui_signal = ta.ulcerindex(df['close'], return_signal=True)
df['UI_Signal'] = ui_signal

# Custom parameters
ui_custom = ta.ulcerindex(df['close'], length=21, smooth_length=21)
df['UI_Custom'] = ui_custom

print(df[['close', 'Ulcer_Index', 'UI_Signal', 'UI_Custom']].tail())
```

***

### STARC Bands

STARC Bands use a Simple Moving Average and Average True Range to create volatility-based bands.

#### Usage

```python
upper, middle, lower = ta.starc(high, low, close, ma_period=5, atr_period=15, multiplier=1.33)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **ma\_period** _(int, default=5)_: Period for SMA calculation
* **atr\_period** _(int, default=15)_: Period for ATR calculation
* **multiplier** _(float, default=1.33)_: ATR multiplier

#### Returns

* **tuple**: (upper\_band, middle\_line, lower\_band) arrays

#### Example

```python
# Calculate STARC Bands
starc_upper, starc_middle, starc_lower = ta.starc(df['high'], df['low'], df['close'])
df['STARC_Upper'] = starc_upper
df['STARC_Middle'] = starc_middle
df['STARC_Lower'] = starc_lower

# Custom parameters
starc_upper_custom, starc_middle_custom, starc_lower_custom = ta.starc(
    df['high'], df['low'], df['close'], 
    ma_period=10, atr_period=20, multiplier=2.0
)

print(df[['close', 'STARC_Upper', 'STARC_Middle', 'STARC_Lower']].tail())
```

***

### Complete Example: Volatility Analysis

```python
from openalgo import ta, api
import pandas as pd

# Initialize API and get data
client = api(api_key='your_api_key_here', host='http://127.0.0.1:5000')
df = client.history(symbol="SBIN", exchange="NSE", interval="5m", 
                   start_date="2025-04-01", end_date="2025-04-08")

# Calculate multiple volatility indicators
df['ATR'] = ta.atr(df['high'], df['low'], df['close'], period=14)
df['NATR'] = ta.natr(df['high'], df['low'], df['close'], period=14)

# Bollinger Bands
bb_upper, bb_middle, bb_lower = ta.bbands(df['close'], period=20, std_dev=2.0)
df['BB_Upper'] = bb_upper
df['BB_Middle'] = bb_middle
df['BB_Lower'] = bb_lower
df['BB_Width'] = ta.bbwidth(df['close'], period=20, std_dev=2.0)
df['BB_Percent_B'] = ta.bbpercent(df['close'], period=20, std_dev=2.0)

# Keltner Channel
kc_upper, kc_middle, kc_lower = ta.keltner(df['high'], df['low'], df['close'])
df['KC_Upper'] = kc_upper
df['KC_Middle'] = kc_middle
df['KC_Lower'] = kc_lower

# Donchian Channel
dc_upper, dc_middle, dc_lower = ta.donchian(df['high'], df['low'], period=20)
df['DC_Upper'] = dc_upper
df['DC_Middle'] = dc_middle
df['DC_Lower'] = dc_lower

# Advanced volatility indicators
df['RVI'], df['RVI_Signal'] = ta.rvi(df['open'], df['high'], df['low'], df['close'])
df['Historical_Vol'] = ta.hv(df['close'], length=20)
df['Ulcer_Index'] = ta.ulcerindex(df['close'])
df['Mass_Index'] = ta.massindex(df['high'], df['low'])

# Chandelier Exit levels
ce_long, ce_short = ta.chandelier_exit(df['high'], df['low'], df['close'])
df['CE_Long'] = ce_long
df['CE_Short'] = ce_short

# Volatility analysis
print("=== Volatility Analysis ===")
print(f"Average ATR: {df['ATR'].mean():.2f}")
print(f"Average NATR: {df['NATR'].mean():.2f}%")
print(f"Average Historical Volatility: {df['Historical_Vol'].mean():.2f}%")
print(f"Average BB Width: {df['BB_Width'].mean():.4f}")

# Recent values
print("\n=== Recent Volatility Indicators ===")
recent_data = df[['close', 'ATR', 'NATR', 'BB_Width', 'RVI', 'Historical_Vol']].tail()
print(recent_data)

# Volatility squeeze detection (BB Width < KC Width equivalent)
df['Squeeze'] = (df['BB_Upper'] - df['BB_Lower']) < (df['KC_Upper'] - df['KC_Lower'])
print(f"\nVolatility Squeeze periods: {df['Squeeze'].sum()} out of {len(df)} periods")
```

### Common Use Cases

1. **Volatility Breakouts**: Use BB Width and Mass Index to identify low volatility periods before breakouts
2. **Risk Management**: Use ATR and NATR for position sizing and stop-loss placement
3. **Overbought/Oversold**: Use BB %B and Bollinger Bandwidth to identify extreme price levels
4. **Trend Strength**: Higher volatility often accompanies strong trends
5. **Market Regime**: Compare different volatility measures to understand market conditions

### Performance Tips

1. **Efficient Calculations**: Use vectorized operations for multiple timeframes
2. **Memory Management**: Calculate only needed indicators to save memory
3. **Parameter Optimization**: Test different periods for your specific market and timeframe
4. **Combination Analysis**: Use multiple volatility indicators together for confirmation
