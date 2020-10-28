import I18n from "I18n";
import { h } from "virtual-dom";
import { emojiUnescape } from "discourse/lib/text";
import RawHtml from "discourse/widgets/raw-html";
import { createWidget } from "discourse/widgets/widget";

function renderDiceInput(attrs) {
  const result = [
    h("span.dice-input.dice-quantity", [attrs.quantity.toString()]),
    "d",
    h("span.dice-input.dice-faces", [attrs.faces.toString()]),
  ];
  if (attrs.modValue && attrs.modValue !== 0) {
    if (attrs.modValue > 0) {
      result.push(h("span.dice-input.dice-mod.dice-mod-pos", ["+", attrs.modValue.toString()]));
    } else {
      result.push(h("span.dice-input.dice-mod.dice-mod-neg", [attrs.modValue.toString()]));
    }
  }
  if (attrs.threshold !== undefined) {
    result.push(h("span.dice-input.dice-threshold-txt", ["t"]));
    result.push(h("span.dice-input.dice-threshold", [attrs.threshold.toString()]));
  }
  if (attrs.individual) {
    result.push(h("span.dice-input.dice-individual-txt", ["i"]));
  }

  return result;
}

createWidget("dice-result", {
  tagName: "blockquote.dice-result",
  buildKey: (attrs) => `dice-result-${attrs.postId}-${attrs.rollId}`,

  html(attrs) {
    let errors = attrs.errors;
    if (errors && errors.length > 0) {
      const warningEmojiHtml = emojiUnescape(":warning:");
      return errors.map(e => {
        return h("div.dice-err-input", [
          new RawHtml({html: warningEmojiHtml}),
          " ",
          h("span.dice-err-msg", {}, I18n.t(e)),
        ]);
      });
    }

    const dieEmojiHtml = emojiUnescape(":game_die:");
    return [
      h("div.dice-input-explain", [
        new RawHtml({html: dieEmojiHtml}),
        " ",
        h("span.dice-input", renderDiceInput(attrs)),
      ]),
    ];
  },
});
