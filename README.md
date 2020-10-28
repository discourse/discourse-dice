# discourse-dice

A theme component that allows users to roll dice in their posts. For more information see [meta topic goes here].

### Modifiers

Currently implemented rolling modifiers include:

 - `+[N]` and `-[N]` - add or subtract a modifier from the result
 - `t[N]` - report pass/fail versus a threshold
 - `i` - report individual results instead of summing up

plus the `crit=N,N,N` attribute on the wrap to specify which (natural) rolls are "criticals".

## Examples

```
[wrap=dice crit=1,20]d20[/wrap]
[wrap=dice]2d6[/wrap]
[wrap=dice]2d6+1t9[/wrap]
```
