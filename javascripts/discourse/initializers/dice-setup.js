import { getRegister } from "discourse/lib/get-owner";
import { withPluginApi } from "discourse/lib/plugin-api";
import WidgetGlue from "discourse/widgets/glue";
import MersenneTwister from "../lib/mersenne-twister";
import murmurhash3 from "../lib/murmurhash3";

const MURMUR_HASH_SEED = 843031067;

// [NdN] - base format, \1 is quantity \2 is faces
// +N or -N - flat modifier, \3 is sign \4 is modifier
// tN - report pass/fail, \5 is threshold
// i - report individual dice, \6 is i
// TODO - kN - keep top N results, \7 is keep count
const diceRegexp = /(\d+)?d(\d+)?(?:([+-])(\d+))?(?:t(\d+))?(i)?/,
  idxQuantity = 1,
  idxFaces = 2,
  idxModSgn = 3,
  idxModValue = 4,
  idxThreshold = 5,
  idxIndividual = 6;

// returns Object{ quantity, faces, modValue, threshold, individual: Boolean, errors: []i18nkey }
function parseDice(match) {
  const errors = [];
  if (!match) {
    errors.push("dice.invalid.generic");
    return { errors };
  }
  const parse = (s) => {
    if (!s) {
      return undefined;
    }
    const r = parseInt(s, 10);
    if (isNaN(r)) {
      return undefined;
    }
    return r;
  };
  const quantityRaw = parse(match[idxQuantity]),
    faces = parse(match[idxFaces]),
    modValueRaw = parse(match[idxModValue]),
    threshold = parse(match[idxThreshold]);
  let quantity = quantityRaw;
  if (quantity === undefined) {
    quantity = 1;
  } else if (!(quantity > 0)) {
    errors.push("dice.invalid.quantity");
  } else if (quantity > settings.max_dice) {
    errors.push("dice.excessive.quantity");
  }
  if (match[idxFaces] === undefined) {
    errors.push("dice.missing.faces");
  } else if (!(faces > 1)) {
    errors.push("dice.invalid.faces");
  } else if (faces > MersenneTwister.prototype.genrand_int26n_max) {
    errors.push("dice.excessive.faces");
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
    quantity,
    faces,
    modValue,
    threshold,
    individual,
    rawInput: null,
    rawResults: null,
    crits: null,
  };
}

// Parses the crit=n,n,n option and writes to attrs.
function parseCrits(critString, attrs) {
  const list = critString.split(",").map((s) => parseInt(s, 10));
  if (list.some(isNaN)) {
    attrs.errors.push("dice.invalid.crits");
    return attrs;
  }
  attrs.crits = list;
  return attrs;
}

function rollDice(rand, attrs) {
  if (attrs.errors && attrs.errors.length) {
    return;
  }

  const results = [];
  for (let i = 0; i < attrs.quantity; i++) {
    results.push(1 + rand.genrand_int26n(attrs.faces));
  }

  attrs.rawResults = results;
  return attrs;
}

export default {
  name: "discourse-dice",

  initialize() {
    withPluginApi("0.8.7", (api) => {
      let _glued = [];

      function cleanUp() {
        _glued.forEach((g) => g.cleanUp());
        _glued = [];
      }

      const register = getRegister(api);
      function attachDiceWidget(container, attrs) {
        const glue = new WidgetGlue("dice-result", register, attrs);
        glue.appendTo(container);
        _glued.push(glue);
      }

      api.decorateCooked(
        ($cooked, helper) => {
          const post = helper?.getModel();
          let rand = null;
          if (post) {
            // Deterministic seed generation: post ID + creation timestamp (UTC ISO8601)
            const seedData = post.id + " " + post.created_at;

            const seed = murmurhash3(seedData, MURMUR_HASH_SEED);
            rand = new MersenneTwister(seed);
          }

          const placeholderNodes = $cooked[0].querySelectorAll(
            ".d-wrap[data-wrap=dice]"
          );
          let seenErrors = false;
          placeholderNodes.forEach((elem) => {
            const match = diceRegexp.exec(elem.innerText);
            const attrs = parseDice(match);
            attrs.rawInput = (match && match[0]) || elem.innerText;
            if (elem.dataset.crit) {
              parseCrits(elem.dataset.crit, attrs);
            }
            if (rand && seenErrors) {
              if (!(attrs.errors && attrs.errors.length > 0)) {
                attrs.errors = ["dice.invalid.halt_after_error"];
              }
            } else if (attrs.errors && attrs.errors.length > 0) {
              seenErrors = true;
            } else if (rand) {
              rollDice(rand, attrs); // attrs.rawResults
            }

            elem.innerHTML = "";
            const sacrificial = document.createElement("div");
            elem.appendChild(sacrificial);
            attachDiceWidget(sacrificial, attrs);
          });
        },
        { id: "discourse-dice" }
      );

      api.cleanupStream(cleanUp);
    });
  },
};
