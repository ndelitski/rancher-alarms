import _ from 'lodash';
import deepSet from 'deep-set';

/*
 Parse linear environment variables to nested object
 translate indexed variables like VAR_0=val1, VAR_1=val2 into var: [val1, val2]
 TARGET_0_URL=
 TARGET_0_TEMPLATE=
 ```json
   target: [{
      url:
      template
   }]
 ```
*/
export default function envToObject(prefix) {
  const prefixRe = new RegExp('^'+prefix, 'i');
  const env = pickKeys(process.env, (k) => k.match(prefixRe));

  return convertIndexedPropsToArrays(_.pairs(env)
    .reduce((obj, [key, v]) => {
      return deepSet(obj, deepPropertyNotation(key), v)
    }, {}))
}

function pickKeys(obj, keyPredicate) {
  return _.pairs(obj).reduce((filteredObj, [k,v]) => {
    if (keyPredicate(k)) {
      filteredObj[k] = v
    }
    return filteredObj
  }, {})
}

function deepPropertyNotation(envKey) {
  return envKey.replace(/_/g, '.').toLowerCase()
}

function convertIndexedPropsToArrays(obj) {
  const keys = _.keys(obj);
  const allKeysAreNumbers = keys.every((k)=>!_.isNaN(parseInt(k)));

  if (allKeysAreNumbers) {
    return Array.apply(null, _.extend(_.clone(obj), {length: keys.length}))
  }

  return _.pairs(obj)
    .reduce((newObj, [k,v]) => {
      newObj[k] = _.isObject(v) ? convertIndexedPropsToArrays(v) : v;

      return newObj;
    }, {});
}



