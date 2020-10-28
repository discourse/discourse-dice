import I18n from "I18n";
import { getRegister } from "discourse-common/lib/get-owner";
import { withPluginApi } from "discourse/lib/plugin-api";
import WidgetGlue from "discourse/widgets/glue";

import MersenneTwister from "discourse/lib/mersenne-twister";
import murmurhash3 from "discourse/lib/murmurhash3";

const MURMUR_HASH_SEED = 843031067;
const MAX_DICE = 101;

// [NdN] - base format, \1 is quantity \2 is faces
// +N or -N - flat modifier, \3 is sign \4 is modifier
// tN - report pass/fail, \5 is threshold
// i - report individual dice, \6 is i
// TODO - kN - keep top N results, \7 is keep count
const diceRegexp = /(\d+)?d(\d+)?(?:([+-])(\d+))?(?:t(\d+))?(i)?/,
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
    quantity = 1;
  } else if (!(quantity > 0)) {
    errors.push("dice.invalid.quantity");
  }
  if (match[idxFaces] === undefined) {
    errors.push("dice.missing.faces");
  } else if (!(faces > 1)) {
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
  } else {
    modValue = null;
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

function rollDice(rand, attrs) {
  if (attrs.errors && attrs.errors.length) return;

  const results = [];
  for (var i = 0; i < attrs.quantity; i++) {
    results.push(rand.genrand_int31n(attrs.faces));
  }

  attrs.rawResults = results;
  return attrs;
}

export default {
  name: "discourse-dice",

  initialize() {
    withPluginApi("0.8.7", api => {
      register = getRegister(api);
      api.decorateCooked(
        ($cooked, postWidget) => {
          const diceNodes = $cooked[0].querySelectorAll(
            ".d-wrap[data-wrap=dice]"
          );

          let rand = null;
          if (postWidget) {
            // Deterministic seed generation: post ID + creation timestamp (UTC ISO8601)
            const postAttrs = postWidget.widget.attrs;
            const seedData = postAttrs.id + " " + postAttrs.created_at;

            const seed = murmurhash3(seedData, MURMUR_HASH_SEED);
            rand = new MersenneTwister(seed);
          }

          const placeholderNodes = $cooked[0].querySelectorAll(
            ".d-wrap[data-wrap=dice]"
          );
          let rollId = 1;
          placeholderNodes.forEach(elem => {
            const match = diceRegexp.exec(elem.innerText);
            const attrs = parseDice(match);
            attrs.rawInput = (match && match[0]) || elem.innerText;
            if (rand) {
              rollDice(rand, attrs); // attrs.rawResults
            }

            const glue = new WidgetGlue("dice-result", register, attrs);
            elem.innerHTML = "";
            glue.appendTo(elem);
          });
        },
        { id: "discourse-dice" }
      );
    });
  }
}
