import { h } from "virtual-dom";
import { emojiUnescape } from "discourse/lib/text";
import RawHtml from "discourse/widgets/raw-html";
import { createWidget } from "discourse/widgets/widget";
import I18n from "I18n";

function renderDiceInput(attrs) {
  const result = [
    h("span.dice-input.dice-quantity", [attrs.quantity.toString()]),
    "d",
    h("span.dice-input.dice-faces", [attrs.faces.toString()]),
  ];
  if (attrs.modValue && attrs.modValue !== 0) {
    if (attrs.modValue > 0) {
      result.push(
        h("span.dice-input.dice-mod.dice-mod-pos", [
          "+",
          attrs.modValue.toString(),
        ])
      );
    } else {
      result.push(
        h("span.dice-input.dice-mod.dice-mod-neg", [attrs.modValue.toString()])
      );
    }
  }
  if (attrs.threshold !== undefined) {
    result.push(h("span.dice-input.dice-threshold-txt", ["t"]));
    result.push(
      h("span.dice-input.dice-threshold", [attrs.threshold.toString()])
    );
  }
  if (attrs.individual) {
    result.push(h("span.dice-input.dice-individual-txt", ["i"]));
  }

  return result;
}

function renderDiceResults(attrs) {
  let joiner = h("span.dice-join-plus", ["+"]);
  if (attrs.individual) {
    joiner = h("span.dice-join-comma", [", "]);
  }
  const totalSum =
    attrs.rawResults.reduce((a, b) => a + b, 0) + (attrs.modValue || 0);
  let numSuccess = 0;

  let thresholdClass = "";
  if (attrs.threshold && !attrs.individual) {
    thresholdClass =
      totalSum >= attrs.threshold ? "threshold-pass" : "threshold-fail";
  }

  const result = attrs.rawResults
    .map(function (die) {
      let dieClass = "die";
      if (attrs.crits && attrs.crits.indexOf(die) !== -1) {
        dieClass += " dice-crit crit-" + die.toString();
      }
      if (attrs.individual) {
        const val = die + (attrs.modValue || 0);
        if (attrs.threshold) {
          dieClass +=
            val >= attrs.threshold ? " threshold-ipass" : " threshold-ifail";
          if (val >= attrs.threshold) {
            numSuccess += 1;
          }
        }
        return h(
          "span",
          {
            className: dieClass,
          },
          [die.toString()]
        );
      } else {
        return h(
          "span",
          {
            className: dieClass,
          },
          [die.toString()]
        );
      }
    })
    .flatMap((node, idx) => {
      if (idx === 0) {
        return [node];
      } else {
        return [joiner, node];
      }
    });

  if (!attrs.individual) {
    let showTotal = false;
    if (attrs.modValue !== null && attrs.modValue !== 0) {
      showTotal = true;
      if (attrs.modValue > 0) {
        result.push(h("span.dice-mod-sym.sym-plus", [" +"]));
        result.push(h("span.dice-mod", [attrs.modValue.toString()]));
      } else {
        result.push(h("span.dice-mod-sym.sym-minus", [" -"]));
        result.push(h("span.dice-mod", [(-attrs.modValue).toString()]));
      }
    }
    if (attrs.quantity > 1) {
      showTotal = true;
    }
    if (showTotal) {
      result.push(h("span.dice-sum-sep", [" = "]));
      result.push(h("span.dice-sum", [totalSum.toString()]));
    }
  } else {
    if (attrs.threshold && attrs.quantity > 1) {
      result.push(h("span.dice-numpass-sep", [" "]));
      result.push(
        h("span.dice-numpass", [
          I18n.t(themePrefix("dice.result.success_count"), {
            count: numSuccess,
          }),
        ])
      );
    }
  }

  return h(
    "div",
    {
      className: "dice-results " + thresholdClass,
    },
    result
  );
}

createWidget("dice-result", {
  tagName: "blockquote.dice-result",
  buildKey: (attrs) => `dice-result-${attrs.postId}-${attrs.rollId}`,

  html(attrs) {
    let errors = attrs.errors;
    if (errors && errors.length > 0) {
      const warningEmojiHtml = emojiUnescape(":warning:");
      return errors.map((e) => {
        const i18nAttrs = {
          input: attrs.rawInput,
        };
        if (e === "dice.excessive.quantity") {
          i18nAttrs.count = settings.max_dice;
        }
        return h("div.dice-err-input", [
          new RawHtml({ html: warningEmojiHtml }),
          " ",
          h("span.dice-err-msg", {}, I18n.t(themePrefix(e), i18nAttrs)),
        ]);
      });
    }

    const dieEmojiHtml = emojiUnescape(":game_die:");
    if (attrs.rawResults) {
      return [
        h("div.dice-input-explain", [
          new RawHtml({ html: dieEmojiHtml }),
          " ",
          h("span.dice-input", renderDiceInput(attrs)),
        ]),
        renderDiceResults(attrs),
      ];
    } else {
      return [
        h("div.dice-input-explain", [
          new RawHtml({ html: dieEmojiHtml }),
          " ",
          h("span.dice-input", renderDiceInput(attrs)),
        ]),
      ];
    }
  },
});
