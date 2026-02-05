# DQL Examples Reference

Curated natural-language → DQL query pairs organized by data source. Use these as patterns when translating user prompts into DQL.

## Table of Contents

1. [Logs](#logs)
2. [Business Events](#business-events)
3. [Generic Events](#generic-events)
4. [Davis Problems](#davis-problems)
5. [Davis Events](#davis-events)
6. [Spans](#spans)
7. [Metrics (timeseries)](#metrics)
8. [Entities](#entities)
9. [Anomaly Detection](#anomaly-detection)
10. [Advanced Patterns](#advanced-patterns)

---

## Logs

**All logs from last 6 hours**
```
fetch logs, from:now() - 6h
```

**Chart logs by loglevel over time, exclude NONE**
```
fetch logs
| filterOut loglevel == "NONE"
| makeTimeseries by:{loglevel}, interval:1h, count = count()
```

**Max logs per hour by loglevel and host**
```
fetch logs
| makeTimeseries by:{loglevel, host = dt.entity.host}, interval:1h, count = count()
| summarize by:{loglevel, host}, max_count = max(arrayMax(count))
```

**Compare error logs today vs yesterday**
```
fetch logs, from:bin(now(), 24h)
| filter loglevel == "ERROR"
| summarize todayErrorCount = count()
| append
[
  fetch logs, from:bin(now(), 24h) - 24h, to:bin(now(), 24h)
  | filter loglevel == "ERROR"
  | summarize yesterdayErrorCount = count()
]
```

**Error logs over last day, hourly granularity**
```
fetch logs, from:now() - 24h
| filter loglevel == "ERROR"
| makeTimeseries interval:1h, count = count()
```

**Top 5 log sources by volume**
```
fetch logs
| summarize by:{log.source}, log_count = count()
| sort log_count desc
| limit 5
```

**Most recurring log lines with source and region**
```
fetch logs
| summarize by:{content, log.source, aws.region}, count = count()
| sort count desc
```

**Slow database queries from logs**
```
fetch logs, from:now() - 48h
| filter contains(content, "slow") AND contains(content, "database")
| summarize by:{loglevel, content}, count = count()
```

**Which host has most error logs? (with host name)**
```
fetch logs
| filter loglevel == "ERROR"
| summarize by:{dt.entity.host}, errorCount = count()
| lookup
[
  fetch dt.entity.host
  | fieldsAdd entity.name
], sourceField:dt.entity.host, lookupField:id, fields:{entity.name}
| sort errorCount desc
| limit 1
```

**Optimized log query blueprint** (bucket filter + sampling + time range)
```
fetch logs, bucket:{"astroshop_log_*"}, from:-1d@d, samplingRatio:10
| filter loglevel == "ERROR" and k8s.namespace.name ~ "astroshop"
| filter content ~ "error"
| summarize c = count(), by:pod.name
| sort c desc
| limit 5
```

**Parse IP and action from log content**
```
fetch logs, bucket:{"astroshop_log_*"}, from:-1d@d, samplingRatio:10
| filter loglevel == "ERROR" and k8s.namespace.name ~ "astroshop"
| parse content, "ipaddr:ip ld ' POST ' ld:action ' HTTP/1.1 ' long:status ld"
| filter action == "/cart" or action == "/cart/checkout"
| summarize count = count(), by:{ip, log.source}
| sort count desc
```

---

## Business Events

**All bizevents during business hours by type and category**
```
fetch bizevents
| fieldsAdd day_of_week = getDayOfWeek(timestamp), hour_of_day = formatTimestamp(timestamp, format:"HH")
| filter day_of_week >= 1 AND day_of_week <= 5 AND hour_of_day >= 9 AND hour_of_day <= 17
| summarize by:{event.type, event.category}, count()
```

**Bizevents last month, business days only, sorted by category**
```
fetch bizevents, from:-720h
| fieldsAdd day_of_week = getDayOfWeek(timestamp)
| filter day_of_week >= 1 AND day_of_week <= 5
| summarize by:{event.type, event.category}, count = count()
| sort event.category
```

**Bizevents over time by type**
```
fetch bizevents
| makeTimeseries by:{event.type}, interval:1h, count = count()
```

**Bizevents timeseries by source/provider**
```
fetch bizevents
| makeTimeseries by:{event.provider}, interval:1h, count = count()
```

**Provider-specific bizevents last week by type**
```
fetch bizevents, from:-168h
| filter event.provider == "www.easytravel.com"
| makeTimeseries by:{event.type}, interval:24h, count = count()
```

**Count trades in last 24h**
```
fetch bizevents, from:now() - 24h, to:now()
| filter event.type == "com.easytrade.trades"
| summarize tradeCount = count()
```

**Summarize events by country**
```
fetch bizevents
| filter event.type == "com.easytrade.buy.finish"
| summarize by:{geo.country.name}, event_count = count()
```

**Count distinct emails matching pattern**
```
fetch bizevents
| filter contains(email, "@gmail.com")
| summarize distinctEmailCount = countDistinct(email)
```

---

## Generic Events

**All events from last 3 hours**
```
fetch events, from:now() - 3h
```

**Aggregated events by kind**
```
fetch events, from:-3h
| summarize by:{event.kind}, count = count()
```

---

## Davis Problems

**Total distinct problems in last 24h**
```
fetch dt.davis.problems, from:now()-24h, to:now()
| summarize {problemCount = countDistinct(event.id)}
```

**Count current active problems**
```
fetch dt.davis.problems
| filter event.status == "ACTIVE"
| summarize {activeProblems = countDistinct(event.id)}
```

**Problems trend over 7 days**
```
fetch dt.davis.problems, from:now()-7d
| makeTimeseries count(default:0)
```

**Top 3 problem-affected entities**
```
fetch dt.davis.problems
| expand affected_entity_ids
| summarize count = countDistinct(display_id), by:{affected_entity_ids}
| sort count, direction:"descending"
| limit 3
```

**Problems for a specific host name (entity lookup)**
```
fetch dt.davis.problems
| expand affected_entity_ids
| fieldsAdd host.name = entityName(affected_entity_ids, type:"dt.entity.host")
| filter host.name == "myhost"
```

**Find problem by display ID**
```
fetch dt.davis.problems
| filter display_id == "P-24051200"
```

**Active problems excluding duplicates**
```
fetch dt.davis.problems
| filter event.status == "ACTIVE" and not dt.davis.is_duplicate == "true"
```

**Mean time to resolve over 7 days**
```
fetch dt.davis.problems, from:now()-7d
| filter event.status == "CLOSED"
| filter dt.davis.is_frequent_event == false and dt.davis.is_duplicate == false and maintenance.is_under_maintenance == false
| makeTimeseries `AVG Problem duration in hours` = avg(toLong(resolved_problem_duration)/3600000000000.0), time:event.end
```

**Concurrently open problems over time (using spread)**
```
fetch dt.davis.problems
| makeTimeseries count = count(), spread: timeframe(from: event.start, to: coalesce(event.end, now()))
```

**Problems by status as timeseries**
```
fetch dt.davis.problems, from:now() - 24h, to:now()
| makeTimeseries by:{status = event.status}, interval:1h, count = count()
```

**Top 10 problems ranked by affected entities**
```
fetch dt.davis.problems, from:now() - 24h
| expand affected_entity_ids
| summarize by:{event.name}, affectedEntityCount = count()
| sort affectedEntityCount desc
| limit 10
```

**Active problems by category as timeseries**
```
fetch dt.davis.problems
| filter event.status == "ACTIVE"
| makeTimeseries by:{event.category}, interval:1h, count = count()
```

**Slowdown problems in last 3 days**
```
fetch dt.davis.problems, from:now() - 72h
| filter event.category == "SLOWDOWN"
| summarize slowdownCount = count()
```

**Problems affecting >500 users**
```
fetch dt.davis.problems
| filter dt.davis.affected_users_count > 500
| fieldsKeep display_id, dt.davis.affected_users_count, event.category, event.description, resolved_problem_duration
```

**Week-by-week problem count this year**
```
fetch dt.davis.problems, from:bin(now(), 24h) - 365d
| fieldsAdd week_of_year = getWeekOfYear(timestamp)
| summarize by:{week_of_year}, problem_count = count()
```

---

## Davis Events

**CPU saturation and high-memory events over 7 days**
```
fetch dt.davis.events, from:now()-7d, to:now()
| filter event.kind == "DAVIS_EVENT"
| filter event.type == "OSI_HIGH_CPU" or event.type == "OSI_HIGH_MEMORY"
| makeTimeseries count = count(default: 0)
```

**Davis events by category**
```
fetch dt.davis.events, from:-48h
| summarize by:{event.category}, event_count = count()
```

**Service slowdown events yesterday**
```
fetch dt.davis.events.snapshots, from:bin(now(), 24h) - 24h, to:bin(now(), 24h)
| filter event.type == "SERVICE_SLOWDOWN"
| summarize slowdown_count = count()
```

**Davis events day-by-day comparison**
```
fetch dt.davis.events, from:now() - 168h, to:now()
| fieldsAdd day = bin(timestamp, 24h)
| summarize by:{day}, event_count = count()
```

---

## Spans

**Average DB response time by host and database**
```
fetch spans
| filter span.kind == "client" AND isNotNull(db.system) AND isNotNull(server.address) AND isNotNull(db.namespace)
| summarize by:{host = server.address, database = db.namespace}, avg_duration = avg(duration)
```

**Average DB response time per minute, split by database**
```
fetch spans
| filter span.kind == "client" AND isNotNull(db.system)
| makeTimeseries by:{db.system}, interval:1m, avg_duration = avg(duration)
```

---

## Metrics

**Top 3 metrics for a specific host**
```
timeseries by:{dt.entity.host}, filter:dt.entity.host == "HOST-12ABC",
  {availability = avg(dt.host.availability), uptime = avg(dt.host.uptime), cpu_usage = avg(dt.host.cpu.usage)}
| fieldsAdd avg_availability = arrayAvg(availability), avg_uptime = arrayAvg(uptime), avg_cpu_usage = arrayAvg(cpu_usage)
| sort avg_availability desc, avg_uptime desc, avg_cpu_usage desc
| limit 3
```

**Lambda execution time timeseries**
```
timeseries by:{dt.entity.aws_lambda_function}, avg_execution_time = avg(dt.cloud.aws.lambda.duration)
```

**CPU usage: last 24h vs same period last week**
```
timeseries from:now() - 24h, to:now(), cpu_usage_last_24h = avg(dt.host.cpu.usage)
| append [timeseries from:now() - 168h - 24h, to:now() - 168h, cpu_usage_last_week = avg(dt.host.cpu.usage)]
```

**Top 10 processes by memory consumption**
```
timeseries by:{dt.entity.process_group_instance, dt.entity.host}, maxMemory = max(dt.process.memory.working_set_size)
| summarize by:{dt.entity.process_group_instance, dt.entity.host}, maxMemory = max(maxMemory)
| sort maxMemory desc
| limit 10
| lookup [fetch dt.entity.host], sourceField:dt.entity.host, lookupField:id, fields:{entity.name}
```

**CPU metrics overview for a host**
```
timeseries by:{dt.entity.host}, filter:dt.entity.host == "HOST-14DC825E0C327E32",
  timeframe:timeframe(from:now() - 24h, to:now()),
  {avg_cpu_usage = avg(dt.host.cpu.usage), avg_cpu_system = avg(dt.host.cpu.system),
   avg_cpu_user = avg(dt.host.cpu.user), avg_cpu_iowait = avg(dt.host.cpu.iowait),
   avg_cpu_load15m = avg(dt.host.cpu.load15m)}
```

**Top 10 K8s containers by CPU**
```
timeseries by:{k8s.container.name}, avg_cpu = avg(dt.kubernetes.container.cpu_usage)
| sort avg_cpu desc
| limit 10
```

**Hosts with CPU > 60% over last week**
```
timeseries by:{dt.entity.host}, from:now() - 168h, cpuUsage = avg(dt.host.cpu.usage)
| filter arrayAvg(cpuUsage) > 60
| lookup [fetch dt.entity.host], sourceField:dt.entity.host, lookupField:id
```

---

## Entities

**Top lambda function by code size**
```
fetch dt.entity.aws_lambda_function
| sort awsCodeSize desc
| fieldsKeep awsCodeSize, entity.name
| limit 1
```

**Most tagged host groups**
```
fetch dt.entity.host_group
| fieldsAdd tags
| expand tags
| summarize by:{entity.name}, tag_count = count()
| sort tag_count desc
| limit 10
```

**Azure VMs vs EC2 instances count**
```
fetch dt.entity.azure_vm
| summarize azure_vm_count = count()
| append
[
  fetch dt.entity.ec2_instance
  | summarize ec2_instance_count = count()
]
```

**5 shortest-lived Kubernetes services**
```
fetch dt.entity.kubernetes_service
| fieldsAdd id, entity.name, lifetime
| fieldsAdd duration = toDuration(lifetime)
| sort duration
| limit 5
```

**Count deployed lambda functions**
```
fetch dt.entity.aws_lambda_function
| summarize deployed_functions = count()
```

---

## Anomaly Detection

**Seasonal baseline for network load**
```
timeseries avg(dt.process.network.load)
```

**Anomaly detection on event count**
```
fetch events
| filter event.kind == "DAVIS_EVENT"
| makeTimeseries count(), time:{timestamp}
```

**Anomaly detection on log pattern occurrence**
```
fetch logs
| filter contains(content, "No journey found")
| makeTimeseries count(), time:{timestamp}
```

**Remove extreme outliers from training data**
```
timeseries load = avg(dt.process.network.load)
| fieldsAdd load_cleaned = iCollectArray(if(load[] < 4, load[]))
| fieldsRemove load
```

---

## Advanced Patterns

**Day-over-day comparison using bin()**
```
fetch dt.davis.events.snapshots, from:now() - 168h, to:now()
| summarize by:{bin(timestamp, 24h)}, dailyEventCount = count()
```

**Business hours filtering pattern**
```
| fieldsAdd day_of_week = getDayOfWeek(timestamp),
            hour_of_day = formatTimestamp(timestamp, format:"HH")
| filter day_of_week >= 1 AND day_of_week <= 5
        AND hour_of_day >= 9 AND hour_of_day <= 17
```

**Parse nested JSON from bizevents**
```
fetch bizevents
| filter event.type == "com.easytrade.offer"
| parse Response, "JSON:json"
| fields timestamp, json
| fieldsFlatten json, prefix:"offerdetails."
```

**Using append for side-by-side comparisons**
```
fetch dt.entity.azure_vm
| summarize azure_vm_count = count()
| append
[
  fetch dt.entity.ec2_instance
  | summarize ec2_instance_count = count()
]
```

**Using spread for overlapping time windows**
```
fetch dt.davis.problems
| makeTimeseries count = count(),
    spread: timeframe(from: event.start, to: coalesce(event.end, now()))
```
