import I18n from "I18n";
import { getRegister } from "discourse-common/lib/get-owner";
import { withPluginApi } from "discourse/lib/plugin-api";
import WidgetGlue from "discourse/widgets/glue";

// [NdN] - base format, \1 is quantity \2 is faces
// +N or -N - flat modifier, \3 is sign \4 is modifier
// tN - report pass/fail, \5 is threshold
// i - report individual dice, \6 is i
// kN - keep top N results, \7 is keep count
const diceRegexp = /(\d+)d(\d+)(?:([+-])(\d+))?(?:t(\d+))?(i)?/,
  idxQuantity = 1,
  idxFaces = 2,
  idxModSgn = 3, idxModValue = 4,
  idxThreshold = 5,
  idxIndividual = 6;

let register;

// returns Object{ quantity, faces, modValue, threshold, individual: Boolean, errors: []i18nkey }
function parseDice(match) {
  const errors = [];
  if (!match) {
    errors.push("dice.invalid.generic");
    return { errors };
  }
  const parse = s => {
    if (!s) return undefined;
    const r = parseInt(s);
    if (isNaN(r)) return undefined;
    return r;
  };
  const quantity = parse(match[idxQuantity]),
    faces = parse(match[idxFaces]),
    modValueRaw = parse(match[idxModValue]),
    threshold = parse(match[idxThreshold]);
  if (match[idxQuantity] === undefined) {
    errors.push("dice.missing.quantity");
  } else if (!(quantity > 0)) {
    errors.push("dice.invalid.quantity");
  }
  if (match[idxFaces] === undefined) {
    errors.push("dice.missing.faces");
  } else if (!(faces > 0)) {
    errors.push("dice.invalid.faces");
  }
  let modValue = modValueRaw;
  if (match[idxModValue] !== undefined) {
    if (!(modValueRaw > 0)) {
      errors.push("dice.invalid.modifier");
    }
    if (match[idxModSgn] === "-") {
      modValue = -modValueRaw;
    }
  }
  if (match[idxThreshold] !== undefined) {
    if (!(threshold > 0)) {
      errors.push("dice.invalid.threshold");
    }
  }
  const individual = match[idxIndividual] === "i";

  return {
    errors,
    quantity, faces, modValue, threshold, individual
  };
}

export default {
  name: "discourse-dice",

  initialize() {
    withPluginApi("0.8.7", api => {
      register = getRegister(api);
      api.decorateCooked(
        ($cooked, postWidget) => {
          const diceNodes = $cooked[0].querySelectorAll(
            ".d-wrap[data-wrap=dice]:not(.rolled)"
          );

          let rand = null;

          if (postWidget) {
            const postAttrs = postWidget.widget.attrs;
            const seedData = postAttrs.id + " " + postAttrs.created_at;
            // TODO: create rand
          }

          const placeholderNodes = $cooked[0].querySelectorAll(
            ".d-wrap[data-wrap=dice]"
          );
          let rollId = 1;
          placeholderNodes.forEach(elem => {
            const match = diceRegexp.exec(elem.innerText);
            const parsed = parseDice(match);


            const attrs = parsed;
            attrs.rawInput = match[0] || elem.innerText;
            const glue = new WidgetGlue("dice-result", register, attrs);
            elem.innerHTML = "";
            glue.appendTo(elem);

            /*

            const blockquote = document.createElement("blockquote");
            blockquote.className = "discourse-dice-wrapper";

            if (parsed.errors.length > 0) {
              const inputSpan = document.createTextNode(elem.innerText);
              inputSpan.className = "dice-err-input";
              parsed.errors.forEach(errKey => {
                const errSpan = document.createElement("p");
                errSpan.innerHTML = warningEmojiHtml;
                const space = document.createTextNode(" ");
                const errText = document.createTextNode(I18n.t(errKey));
                errSpan.appendChild(space);
                errSpan.appendChild(errText);
                blockquote.appendChild(errSpan);
              });

              elem.innerHTML = "";
              elem.appendChild(blockquote);
              return;
            }
            */

          });
        },
        { id: "discourse-dice" }
      );
    });
  }
}
