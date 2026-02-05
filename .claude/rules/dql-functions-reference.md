# DQL Functions Reference

Complete function catalog organized by category. Use to select the right function for a query.

## Table of Contents

1. [Aggregation Functions](#aggregation-functions)
2. [String Functions](#string-functions)
3. [Time Functions](#time-functions)
4. [Array Functions](#array-functions)
5. [Conversion & Casting](#conversion--casting)
6. [Conditional Functions](#conditional-functions)
7. [Boolean Functions](#boolean-functions)
8. [IP Functions](#ip-functions)
9. [Hash Functions](#hash-functions)
10. [Math Functions](#math-functions)

---

## Aggregation Functions

Used with `summarize` and `makeTimeseries` commands.

| Function | Description | Example |
|---|---|---|
| `count()` | Count total records | `summarize c = count()` |
| `countDistinct(field)` | Count unique values | `summarize unique = countDistinct(user_id)` |
| `countDistinctApprox(field)` | Approximate cardinality (faster) | `summarize approx = countDistinctApprox(ip)` |
| `countDistinctExact(field)` | Exact cardinality (up to 1M) | `summarize exact = countDistinctExact(id)` |
| `countIf(condition)` | Count matching condition | `summarize errors = countIf(status >= 400)` |
| `avg(field)` | Average value | `summarize avg_dur = avg(duration)` |
| `sum(field)` | Sum values | `summarize total = sum(bytes)` |
| `min(field)` | Minimum value | `summarize first = min(timestamp)` |
| `max(field)` | Maximum value | `summarize peak = max(cpu)` |
| `median(field)` | Median (50th percentile) | `summarize med = median(response_time)` |
| `percentile(field, p)` | Nth percentile | `summarize p95 = percentile(duration, 95)` |
| `stddev(field)` | Standard deviation | `summarize sd = stddev(latency)` |
| `variance(field)` | Variance | `summarize v = variance(latency)` |
| `correlation(f1, f2)` | Pearson correlation | `summarize cor = correlation(cpu, memory)` |
| `collectArray(field)` | Collect into array | `summarize all_ids = collectArray(id)` |
| `collectDistinct(field)` | Collect unique into array | `summarize unique = collectDistinct(status)` |
| `takeAny(field)` | Any non-null value | `summarize sample = takeAny(host)` |
| `takeFirst(field)` | First value | `summarize first = takeFirst(msg)` |
| `takeLast(field)` | Last value | `summarize last = takeLast(status)` |
| `takeMax(field)` | Value at max | `summarize peak = takeMax(cpu)` |
| `takeMin(field)` | Value at min | `summarize low = takeMin(cpu)` |

---

## String Functions

| Function | Description |
|---|---|
| `contains(str, substr)` | Test if string contains substring |
| `startsWith(str, prefix)` | Test if string starts with prefix |
| `endsWith(str, suffix)` | Test if string ends with suffix |
| `like(str, pattern)` | SQL-like pattern matching |
| `matchesValue(str, pattern)` | Match using DQL value patterns |
| `matchesPhrase(str, phrase)` | Token-based phrase matching |
| `matchesPattern(str, dpl)` | Match using DPL pattern |
| `concat(a, b, ...)` | Concatenate strings |
| `lower(str)` | Convert to lowercase |
| `upper(str)` | Convert to uppercase |
| `trim(str)` | Remove leading/trailing whitespace |
| `substring(str, start, end)` | Extract substring by index |
| `stringLength(str)` | Get string length |
| `indexOf(str, substr)` | First occurrence index |
| `lastIndexOf(str, substr)` | Last occurrence index |
| `replaceString(str, old, new)` | Replace substring |
| `replacePattern(str, dpl, new)` | Replace by DPL pattern |
| `splitString(str, delim)` | Split into array |
| `splitByPattern(str, dpl)` | Split by DPL pattern |
| `parse(str, pattern)` | Extract values using DPL or JSON |
| `parseAll(str, pattern)` | Extract all matches |
| `jsonField(str, name)` | Extract JSON field by name |
| `jsonPath(str, path)` | Extract via JSONPath expression |
| `levenshteinDistance(a, b)` | Edit distance between strings |
| `punctuation(str)` | Extract punctuation characters |
| `encodeUrl(str)` | URL-encode |
| `decodeUrl(str)` | URL-decode |
| `escape(str)` | Escape special characters |
| `unescape(str)` | Unescape special characters |
| `unescapeHtml(str)` | Unescape HTML entities |
| `getCharacter(str, idx)` | Get character at position |

---

## Time Functions

| Function | Description |
|---|---|
| `now()` | Current query start time |
| `timestamp(year, month, day, ...)` | Create timestamp from parts |
| `timestampFromUnixMillis(ms)` | Timestamp from Unix ms |
| `timestampFromUnixSeconds(s)` | Timestamp from Unix s |
| `timestampFromUnixNanos(ns)` | Timestamp from Unix ns |
| `unixMillisFromTimestamp(ts)` | Convert to Unix ms |
| `unixSecondsFromTimestamp(ts)` | Convert to Unix s |
| `unixNanosFromTimestamp(ts)` | Convert to Unix ns |
| `formatTimestamp(ts, format:pat)` | Format as string (`"HH"`, `"EE"`, etc.) |
| `duration(amount, unit)` | Create duration value |
| `timeframe(from:, to:)` | Create timeframe struct |
| `getYear(ts)` | Extract year |
| `getMonth(ts)` | Extract month (1-12) |
| `getDayOfMonth(ts)` | Extract day of month |
| `getDayOfWeek(ts)` | Extract day of week (1=Mon, 7=Sun) |
| `getDayOfYear(ts)` | Extract day of year |
| `getWeekOfYear(ts)` | Extract ISO week number |
| `getHour(ts)` | Extract hour (0-23) |
| `getMinute(ts)` | Extract minute |
| `getSecond(ts)` | Extract second |
| `getStart(tf)` | Get start of timeframe |
| `getEnd(tf)` | Get end of timeframe |

---

## Array Functions

| Function | Description |
|---|---|
| `array(a, b, ...)` | Create array from values |
| `arrayAvg(arr)` | Average of array elements |
| `arrayMax(arr)` | Maximum element |
| `arrayMin(arr)` | Minimum element |
| `arrayMedian(arr)` | Median of elements |
| `arrayFirst(arr)` | First non-null element |
| `arrayLast(arr)` | Last non-null element |
| `arrayConcat(a, b)` | Concatenate arrays |
| `arrayDistinct(arr)` | Remove duplicates |
| `arrayFlatten(arr)` | Flatten nested arrays |
| `arrayIndexOf(arr, val)` | Index of first match |
| `arrayLastIndexOf(arr, val)` | Index of last match |
| `arrayDelta(arr)` | Differences between consecutive elements |
| `arrayCumulativeSum(arr)` | Running total |
| `arrayMovingAvg(arr, window)` | Moving average |
| `arrayMovingMax(arr, window)` | Moving maximum |

---

## Conversion & Casting

### Safe casting (`as*` — returns null if wrong type)

`asString`, `asLong`, `asDouble`, `asBoolean`, `asTimestamp`, `asDuration`, `asTimeframe`, `asArray`, `asRecord`, `asBinary`, `asIp`, `asUid`, `asSmartscapeId`

### Converting (`to*` — converts between types)

`toString`, `toLong`, `toDouble`, `toBoolean`, `toTimestamp`, `toDuration`, `toTimeframe`, `toArray`, `toIp`, `toUid`, `toSmartscapeId`

### Other

| Function | Description |
|---|---|
| `type(value)` | Returns type as string |
| `hexStringToNumber(hex)` | Hex string → number |
| `numberToHexString(num)` | Number → hex string |
| `encode(data, format)` | Encode (base64, hex) |
| `decode(str, format)` | Decode (base64, hex) |
| `getHighBits(uid)` | Upper bits of uid/IP |
| `getLowBits(uid)` | Lower bits of uid/IP |
| `uid64(long)` | Create uid64 |
| `uid128(hi, lo)` | Create uid128 |
| `uuid(hi, lo)` | Create uuid |
| `isUid64(val)` | Test uid subtype |
| `isUid128(val)` | Test uid subtype |
| `isUuid(val)` | Test uid subtype |
| `smartscapeId(str, long)` | Create smartscapeId |

---

## Conditional Functions

| Function | Description | Example |
|---|---|---|
| `if(cond, then, else)` | Conditional expression | `fieldsAdd level = if(cpu > 80, "HIGH", "OK")` |
| `coalesce(a, b, ...)` | First non-null argument | `fieldsAdd name = coalesce(alias, entity.name)` |

---

## Boolean Functions

| Function | Description |
|---|---|
| `isNull(value)` | True if null |
| `isNotNull(value)` | True if not null |
| `isTrueOrNull(expr)` | True if true or null |
| `isFalseOrNull(expr)` | True if false or null |

---

## IP Functions

| Function | Description |
|---|---|
| `isIpAddress(expr)` | Is valid IPv4/v6 |
| `isIpv4(expr)` | Is IPv4 |
| `isIpv6(expr)` | Is IPv6 |
| `isPrivateIp(ip)` | Is private range |
| `isPublicIp(ip)` | Is public range |
| `isLoopbackIp(ip)` | Is loopback |
| `isLinkLocalIp(ip)` | Is link-local |
| `ipContains(network, ip)` | IP in CIDR range |
| `ipMask(ip, bits)` | Mask IP address |

---

## Hash Functions

| Function | Description |
|---|---|
| `crc32(str)` | CRC32 hash |
| `md5(str)` | MD5 hash |
| `sha1(str)` | SHA-1 hash |
| `sha256(str)` | SHA-256 hash |
| `sha512(str)` | SHA-512 hash |
