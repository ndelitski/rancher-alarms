import _ from 'lodash';
import assert from 'assert';

export default function renderTemplate(template, data) {
  var result = template;

  // interpolate string
  for (let [k,v] of _.pairs(data)) {
    result = result.replace(`#{${k}}`, v)
  }

  // check if not all variables are filled
  let freeVariables = result.match(/#\{(\S+)\}/g);
  assert(!freeVariables, `template has unresolved variables:\ntemplate: ${template}\nmissing variables: ${(freeVariables || []).join(', ')}`);

  return result;
}
