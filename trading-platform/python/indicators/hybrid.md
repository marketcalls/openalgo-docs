# Hybrid

Hybrid indicators combine multiple analytical approaches to provide comprehensive market analysis. These indicators often merge trend, momentum, volatility, and volume components for enhanced signal quality.

### Import Statement

```python
from openalgo import api, ta

# Get data using OpenAlgo API
client = api(api_key='your_api_key_here', host='http://127.0.0.1:5000')
df = client.history(symbol="SBIN", exchange="NSE", interval="5m", 
                   start_date="2025-04-01", end_date="2025-04-08")
```

### Available Hybrid Indicators

***

### Average Directional Index (ADX)

ADX measures the strength of a trend regardless of direction, providing both directional indicators (+DI, -DI) and trend strength (ADX).

#### Usage

```python
di_plus, di_minus, adx = ta.adx(high, low, close, period=14)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=14)_: Period for ADX calculation

#### Returns

* **tuple**: (+DI, -DI, ADX) arrays in the same format as input

#### Example

```python
# Calculate ADX system
di_plus, di_minus, adx = ta.adx(df['high'], df['low'], df['close'], period=14)

df['DI_Plus'] = di_plus
df['DI_Minus'] = di_minus  
df['ADX'] = adx

# Trend analysis
df['Trend_Strength'] = df['ADX'].apply(lambda x: 'Strong' if x > 25 else 'Weak' if x > 20 else 'No Trend')
df['Trend_Direction'] = df.apply(lambda row: 'Bullish' if row['DI_Plus'] > row['DI_Minus'] 
                                 else 'Bearish' if row['DI_Minus'] > row['DI_Plus'] else 'Neutral', axis=1)

print(df[['close', 'DI_Plus', 'DI_Minus', 'ADX', 'Trend_Strength', 'Trend_Direction']].tail())
```

***

### Aroon Indicator

Aroon indicators measure the time since the highest high and lowest low, indicating trend strength and potential reversals.

#### Usage

```python
aroon_up, aroon_down = ta.aroon(high, low, period=25)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **period** _(int, default=25)_: Period for Aroon calculation

#### Returns

* **tuple**: (aroon\_up, aroon\_down) arrays in the same format as input

#### Example

```python
# Calculate Aroon indicators
aroon_up, aroon_down = ta.aroon(df['high'], df['low'], period=25)

df['Aroon_Up'] = aroon_up
df['Aroon_Down'] = aroon_down
df['Aroon_Oscillator'] = df['Aroon_Up'] - df['Aroon_Down']

# Signal interpretation
df['Aroon_Signal'] = df.apply(lambda row: 
    'Strong Uptrend' if row['Aroon_Up'] > 70 and row['Aroon_Down'] < 30
    else 'Strong Downtrend' if row['Aroon_Down'] > 70 and row['Aroon_Up'] < 30
    else 'Sideways' if abs(row['Aroon_Up'] - row['Aroon_Down']) < 20
    else 'Trending', axis=1)

print(df[['close', 'Aroon_Up', 'Aroon_Down', 'Aroon_Oscillator', 'Aroon_Signal']].tail())
```

***

### Pivot Points

Traditional pivot points calculate support and resistance levels based on previous period's high, low, and close.

#### Usage

```python
pivot, r1, s1, r2, s2, r3, s3 = ta.pivot_points(high, low, close)
pivot, r1, s1, r2, s2, r3, s3 = ta.pivot_points(high, low, close, anchor="D")  # from SDK 2.1.0
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **anchor** _(str or None, default=None)_: From SDK 2.1.0. `None` applies the formula to each bar's own high, low and close: the levels on a bar are the levels for the **next** bar, known only once that bar has closed. `"D"` (or `"Session"`), `"Week"`, `"Month"` and the other anchors of `ta.vwap` return, on every bar, the levels of the **previous completed period**, so an intraday bar carries yesterday's levels. The bars of the first period are NaN. An anchor needs bar times; without them it raises `ValueError`.
* **timestamps** _(array-like, optional)_: From SDK 2.1.0. Bar times, one per bar, for NumPy arrays and lists, which carry none.

#### Returns

* **tuple**: (pivot, r1, s1, r2, s2, r3, s3) arrays, or Series for pandas input

{% hint style="info" %}
Without `anchor` (the only form in SDK 2.0.5) the levels on a bar come from that same bar, so do not compare them with that bar's own prices in a backtest: use them from the next bar on, or use `anchor="D"` for the classic daily floor pivots.
{% endhint %}

#### Example

```python
# Calculate Pivot Points
pivot, r1, s1, r2, s2, r3, s3 = ta.pivot_points(df['high'], df['low'], df['close'])

df['Pivot'] = pivot
df['Resistance_1'] = r1
df['Support_1'] = s1
df['Resistance_2'] = r2
df['Support_2'] = s2
df['Resistance_3'] = r3
df['Support_3'] = s3

# Identify price position relative to pivot
df['Price_Position'] = df.apply(lambda row:
    'Above R2' if row['close'] > row['Resistance_2']
    else 'Above R1' if row['close'] > row['Resistance_1']
    else 'Above Pivot' if row['close'] > row['Pivot']
    else 'Below Pivot' if row['close'] < row['Support_1']
    else 'Below S1' if row['close'] < row['Support_2']
    else 'Below S2' if row['close'] < row['Support_2']
    else 'Near Pivot', axis=1)

print(df[['close', 'Pivot', 'Resistance_1', 'Support_1', 'Price_Position']].tail())
```

Daily pivots on intraday bars, without a server: two sessions of synthetic 5-minute bars, and the second day's levels taken from the first day's high, low and close.

<!-- runnable -->
```python
import numpy as np
import pandas as pd

from openalgo import ta

times = pd.DatetimeIndex(
    [t for day in ("2026-10-05", "2026-10-06")
     for t in pd.date_range(f"{day} 09:15", periods=75, freq="5min", tz="Asia/Kolkata")]
)
close = pd.Series(np.linspace(800, 815, len(times)).round(2), index=times)
high, low = close + 1, close - 1

pivot, r1, s1, r2, s2, r3, s3 = ta.pivot_points(high, low, close, anchor="D")
print("day 1:", pivot.iloc[0], pivot.iloc[74])  # no completed day yet
print("day 2: pivot", round(pivot.iloc[75], 2), "R1", round(r1.iloc[75], 2), "S1", round(s1.iloc[75], 2))

day1 = slice(0, 75)
expected = (high.iloc[day1].max() + low.iloc[day1].min() + close.iloc[74]) / 3
print("from day 1's high, low and close:", round(expected, 2))
```

<!-- output -->
```text
day 1: nan nan
day 2: pivot 804.97 R1 810.93 S1 801.48
from day 1's high, low and close: 804.97
```

***

### Parabolic SAR

Parabolic SAR provides trailing stop levels. By default `ta.psar` returns the stop levels only; from SDK 2.1.0 `return_trend=True` also returns the trend.

#### Usage

```python
sar_values = ta.psar(high, low, acceleration=0.02, maximum=0.2)
sar_values, trend = ta.psar(high, low, return_trend=True)  # from SDK 2.1.0
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **acceleration** _(float, default=0.02)_: Acceleration factor: its starting value and its step
* **maximum** _(float, default=0.2)_: Maximum acceleration factor
* **return\_trend** _(bool, default=False)_: From SDK 2.1.0. True returns `(sar, trend)`

#### Returns

* **array**: SAR stop levels in the same format as input. With `return_trend=True`, a tuple `(sar, trend)`, where trend is `+1` while long (SAR below price) and `-1` while short. The first bar always starts long. Without `return_trend` (and in SDK 2.0.5), derive the direction by comparing price with the SAR: price above SAR is an uptrend, price below SAR is a downtrend.

{% hint style="info" %}
**From SDK 2.1.0, some SAR values change.** On an outside bar that reverses the trend, the new stop starts at that bar's extreme and is clamped to the two previous bars (SDK 2.0.5 started from the previous extreme point and did not clamp), and a bar that only touches the stop no longer reverses. Values differ from such a bar until the next reversal; ordinary bars are unchanged. A bar with a NaN high or low is NaN and the calculation carries on after it (2.0.5 stayed NaN to the end of the series). There is no switch for the 2.0.5 values.
{% endhint %}

#### Example

```python
# Calculate Parabolic SAR
sar_values = ta.psar(df['high'], df['low'])

df['SAR'] = sar_values

# Derive trend direction from the SAR position: -1 uptrend, 1 downtrend
df['SAR_Trend'] = (df['close'] > df['SAR']).map({True: -1, False: 1})

# Generate trading signals
df['SAR_Signal'] = df.apply(lambda row:
    'Buy' if row['close'] > row['SAR']    # Uptrend
    else 'Sell' if row['close'] < row['SAR']  # Downtrend
    else 'Hold', axis=1)

# Calculate distance from SAR (risk management)
df['SAR_Distance'] = abs(df['close'] - df['SAR'])
df['SAR_Distance_Pct'] = (df['SAR_Distance'] / df['close']) * 100

print(df[['close', 'SAR', 'SAR_Signal', 'SAR_Distance_Pct']].tail())
```

The trend output on synthetic prices, without a server:

<!-- runnable -->
```python
import numpy as np

from openalgo import ta

k = np.arange(30)
close = 100 + 5 * np.sin(k / 4)
sar, trend = ta.psar(close + 1, close - 1, return_trend=True)
print("SAR  ", np.round(sar[6:14], 2))
print("trend", trend[6:14])
```

<!-- output -->
```text
SAR   [100.89 101.6  102.22 102.75 105.99 105.91 105.71 105.35]
trend [ 1.  1.  1.  1. -1. -1. -1. -1.]
```

Note the sign: `trend` is `+1` while long, the opposite of the `SAR_Trend` column derived in the example above.

***

### Directional Movement Index (DMI)

DMI focuses on the directional indicators (+DI and -DI) without the ADX component.

#### Usage

```python
di_plus, di_minus = ta.dmi(high, low, close, period=14)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=14)_: Period for DMI calculation

#### Returns

* **tuple**: (+DI, -DI) arrays in the same format as input

#### Example

```python
# Calculate DMI
di_plus, di_minus = ta.dmi(df['high'], df['low'], df['close'])

df['DI_Plus'] = di_plus
df['DI_Minus'] = di_minus
df['DI_Spread'] = df['DI_Plus'] - df['DI_Minus']

# Generate directional signals
df['DMI_Signal'] = df.apply(lambda row:
    'Strong Buy' if row['DI_Plus'] > row['DI_Minus'] and row['DI_Spread'] > 10
    else 'Buy' if row['DI_Plus'] > row['DI_Minus']
    else 'Strong Sell' if row['DI_Minus'] > row['DI_Plus'] and row['DI_Spread'] < -10
    else 'Sell' if row['DI_Minus'] > row['DI_Plus']
    else 'Neutral', axis=1)

print(df[['close', 'DI_Plus', 'DI_Minus', 'DI_Spread', 'DMI_Signal']].tail())
```

***

### Williams Fractals

Williams Fractals identify turning points (fractals) in price action using local highs and lows.

#### Usage

```python
fractal_up, fractal_down = ta.fractals(high, low, periods=2)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **periods** _(int, default=2)_: Number of periods to check (minimum 2)

#### Returns

* **tuple**: (fractal\_up, fractal\_down) boolean arrays indicating fractal points

#### Example

```python
# Calculate Williams Fractals
fractal_up, fractal_down = ta.fractals(df['high'], df['low'], periods=2)

df['Fractal_Up'] = fractal_up
df['Fractal_Down'] = fractal_down

# Mark fractal levels
df['Fractal_High'] = df['high'].where(df['Fractal_Up'])
df['Fractal_Low'] = df['low'].where(df['Fractal_Down'])

# Count recent fractals for market structure analysis
window = 20
df['Recent_Fractal_Highs'] = df['Fractal_Up'].rolling(window).sum()
df['Recent_Fractal_Lows'] = df['Fractal_Down'].rolling(window).sum()

df['Market_Structure'] = df.apply(lambda row:
    'Bullish Structure' if row['Recent_Fractal_Lows'] > row['Recent_Fractal_Highs']
    else 'Bearish Structure' if row['Recent_Fractal_Highs'] > row['Recent_Fractal_Lows']
    else 'Balanced', axis=1)

print(df[['close', 'Fractal_High', 'Fractal_Low', 'Market_Structure']].dropna().tail())
```

***

### Random Walk Index (RWI)

RWI measures how much a security's price movement differs from a random walk, helping identify trending vs. random price movements.

#### Usage

```python
rwi_high, rwi_low = ta.rwi(high, low, close, period=14)
```

#### Parameters

* **high** _(array-like)_: High prices
* **low** _(array-like)_: Low prices
* **close** _(array-like)_: Closing prices
* **period** _(int, default=14)_: Period for RWI calculation

#### Returns

* **tuple**: (rwi\_high, rwi\_low) arrays in the same format as input

#### Example

```python
# Calculate Random Walk Index
rwi_high, rwi_low = ta.rwi(df['high'], df['low'], df['close'], period=14)

df['RWI_High'] = rwi_high
df['RWI_Low'] = rwi_low
df['RWI_Max'] = df[['RWI_High', 'RWI_Low']].max(axis=1)

# Interpret RWI signals
df['RWI_Signal'] = df.apply(lambda row:
    'Strong Uptrend' if row['RWI_High'] > 1.0 and row['RWI_High'] > row['RWI_Low']
    else 'Strong Downtrend' if row['RWI_Low'] > 1.0 and row['RWI_Low'] > row['RWI_High']
    else 'Weak Uptrend' if row['RWI_High'] > row['RWI_Low'] and row['RWI_High'] > 0.6
    else 'Weak Downtrend' if row['RWI_Low'] > row['RWI_High'] and row['RWI_Low'] > 0.6
    else 'Random Walk', axis=1)

# Calculate trend strength
df['Trend_Strength_RWI'] = df['RWI_Max'].apply(lambda x:
    'Very Strong' if x > 1.5
    else 'Strong' if x > 1.0
    else 'Moderate' if x > 0.6
    else 'Weak')

print(df[['close', 'RWI_High', 'RWI_Low', 'RWI_Signal', 'Trend_Strength_RWI']].tail())
```

***

### Complete Example: Comprehensive Trend Analysis

```python
import pandas as pd
from openalgo import api, ta

# Get market data
client = api(api_key='your_api_key_here', host='http://127.0.0.1:5000')
df = client.history(symbol="SBIN", exchange="NSE", interval="5m", 
                   start_date="2025-04-01", end_date="2025-04-08")

# Calculate multiple hybrid indicators
print("Calculating hybrid indicators...")

# ADX System
di_plus, di_minus, adx = ta.adx(df['high'], df['low'], df['close'])
df['DI_Plus'] = di_plus
df['DI_Minus'] = di_minus
df['ADX'] = adx

# Aroon System
aroon_up, aroon_down = ta.aroon(df['high'], df['low'])
df['Aroon_Up'] = aroon_up
df['Aroon_Down'] = aroon_down
df['Aroon_Osc'] = df['Aroon_Up'] - df['Aroon_Down']

# Parabolic SAR (values only; direction is derived from price vs SAR)
sar_values = ta.psar(df['high'], df['low'])
df['SAR'] = sar_values
df['SAR_Trend'] = (df['close'] > df['SAR']).map({True: -1, False: 1})

# Random Walk Index
rwi_high, rwi_low = ta.rwi(df['high'], df['low'], df['close'])
df['RWI_High'] = rwi_high
df['RWI_Low'] = rwi_low

# Williams Fractals
fractal_up, fractal_down = ta.fractals(df['high'], df['low'])
df['Fractal_Up'] = fractal_up
df['Fractal_Down'] = fractal_down

# Create comprehensive trend signal
def comprehensive_trend_signal(row):
    signals = []
    
    # ADX Signal
    if row['ADX'] > 25:
        if row['DI_Plus'] > row['DI_Minus']:
            signals.append('ADX_Bull')
        else:
            signals.append('ADX_Bear')
    
    # Aroon Signal
    if row['Aroon_Up'] > 70:
        signals.append('Aroon_Bull')
    elif row['Aroon_Down'] > 70:
        signals.append('Aroon_Bear')
    
    # SAR Signal
    if row['close'] > row['SAR']:
        signals.append('SAR_Bull')
    else:
        signals.append('SAR_Bear')
    
    # RWI Signal
    if row['RWI_High'] > 1.0 and row['RWI_High'] > row['RWI_Low']:
        signals.append('RWI_Bull')
    elif row['RWI_Low'] > 1.0 and row['RWI_Low'] > row['RWI_High']:
        signals.append('RWI_Bear')
    
    # Count bullish vs bearish signals
    bull_count = len([s for s in signals if 'Bull' in s])
    bear_count = len([s for s in signals if 'Bear' in s])
    
    if bull_count > bear_count and bull_count >= 2:
        return f'Bullish ({bull_count}/{len(signals)})'
    elif bear_count > bull_count and bear_count >= 2:
        return f'Bearish ({bear_count}/{len(signals)})'
    else:
        return f'Neutral ({bull_count}B/{bear_count}B)'

df['Comprehensive_Signal'] = df.apply(comprehensive_trend_signal, axis=1)

# Calculate signal strength
df['Signal_Strength'] = df.apply(lambda row:
    row['ADX'] * 0.3 + abs(row['Aroon_Osc']) * 0.3 + 
    max(row['RWI_High'], row['RWI_Low']) * 40, axis=1)

# Display results
result_columns = ['close', 'ADX', 'Aroon_Osc', 'SAR', 'RWI_High', 'RWI_Low', 
                 'Comprehensive_Signal', 'Signal_Strength']

print("\nComprehensive Trend Analysis:")
print(df[result_columns].tail(10))

# Summary statistics
print(f"\nSignal Distribution:")
print(df['Comprehensive_Signal'].value_counts())

print(f"\nAverage Signal Strength: {df['Signal_Strength'].mean():.2f}")
print(f"Current Signal Strength: {df['Signal_Strength'].iloc[-1]:.2f}")
```

### Advanced Usage: Multi-Timeframe Analysis

```python
# Function to get multiple timeframe data
def get_multi_timeframe_data(symbol, exchange, start_date, end_date):
    timeframes = ['1m', '5m', '15m', '1h']
    data = {}
    
    for tf in timeframes:
        try:
            df = client.history(symbol=symbol, exchange=exchange, interval=tf,
                              start_date=start_date, end_date=end_date)
            data[tf] = df
        except Exception as e:
            print(f"Error fetching {tf} data: {e}")
    
    return data

# Multi-timeframe trend analysis
def analyze_multi_timeframe_trend(data_dict):
    results = {}
    
    for timeframe, df in data_dict.items():
        # Calculate key hybrid indicators
        di_plus, di_minus, adx = ta.adx(df['high'], df['low'], df['close'])
        aroon_up, aroon_down = ta.aroon(df['high'], df['low'])
        
        latest_adx = adx.iloc[-1] if not pd.isna(adx.iloc[-1]) else 0
        latest_di_plus = di_plus.iloc[-1] if not pd.isna(di_plus.iloc[-1]) else 0
        latest_di_minus = di_minus.iloc[-1] if not pd.isna(di_minus.iloc[-1]) else 0
        latest_aroon_up = aroon_up.iloc[-1] if not pd.isna(aroon_up.iloc[-1]) else 0
        latest_aroon_down = aroon_down.iloc[-1] if not pd.isna(aroon_down.iloc[-1]) else 0
        
        # Determine trend
        if latest_adx > 25:
            if latest_di_plus > latest_di_minus:
                trend = 'Bullish'
            else:
                trend = 'Bearish'
        else:
            trend = 'Sideways'
        
        results[timeframe] = {
            'Trend': trend,
            'ADX': latest_adx,
            'Aroon_Strength': abs(latest_aroon_up - latest_aroon_down)
        }
    
    return results

# Example usage
# mtf_data = get_multi_timeframe_data("SBIN", "NSE", "2025-04-01", "2025-04-08")
# mtf_analysis = analyze_multi_timeframe_trend(mtf_data)
# print("Multi-Timeframe Analysis:", mtf_analysis)
```

### Performance Tips

1. **Vectorized Operations**: Use pandas operations for better performance with large datasets
2. **Memory Optimization**: Calculate only needed indicators to reduce memory usage
3. **Caching**: Store intermediate calculations for reuse across multiple indicators
4. **Batch Processing**: Process multiple symbols together when possible

### Common Use Cases

1. **Trend Confirmation**: Use ADX with Aroon for trend strength validation
2. **Entry Timing**: Combine SAR with DMI for precise entry points
3. **Support/Resistance**: Use Pivot Points with Fractals for key levels
4. **Risk Management**: Use RWI to distinguish trending from random movements
5. **Multi-Timeframe**: Align signals across different timeframes for higher probability trades
