@.claude/CLAUDE.md

### Key DQL Syntax Rules

| Rule         | Correct                   | Wrong                 |
| ------------ | ------------------------- | --------------------- |
| Arrays       | `{"a", "b"}`              | `('a', 'b')`          |
| Equality     | `field == "value"`        | `field = 'value'`     |
| IN operator  | `in(field, array("a", "b"))`   | `field IN ('a', 'b')` |
| Named params | `round(val, decimals: 2)` | `round(val, 2)`       |
