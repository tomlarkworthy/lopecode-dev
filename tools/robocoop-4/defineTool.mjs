// Vendored minimal tool-normalization (port of robocoop-3 _dmhyth + _1d08ll1). No registry.

export function defineTool({ id, description, parameters, execute }) {
  if (!id || typeof id !== 'string') throw new Error('Tool must have a string id');
  if (!description || typeof description !== 'string')
    throw new Error('Tool must have a string description');
  if (!parameters || typeof parameters !== 'object')
    throw new Error('Tool must have a parameters object');
  if (!execute || typeof execute !== 'function')
    throw new Error('Tool must have an execute function');
  return {
    id,
    description,
    parameters,
    execute: async (args, ctx) => {
      try {
        if (ctx?.abort?.aborted)
          return { title: id + ' aborted', output: 'Execution was aborted', metadata: { aborted: true } };
        const result = await execute(args, ctx);
        return {
          title: result.title || id + ' completed',
          output: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
          metadata: { ...(ctx?.getMetadata?.() || {}), ...result.metadata },
        };
      } catch (error) {
        return {
          title: id + ' failed',
          output: 'Error: ' + error.message,
          metadata: { error: true, errorMessage: error.message },
        };
      }
    },
  };
}

export function validateParameters(schema, value) {
  const validate = (schema, value) => {
    const errors = [];
    if (!schema || typeof schema !== 'object') return { valid: true, errors };
    const type = schema.type;
    if (type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push('Expected object');
        return { valid: false, errors };
      }
      const props = schema.properties || {};
      const required = Array.isArray(schema.required) ? schema.required : [];
      for (const field of required) if (!(field in value)) errors.push('Missing required field: ' + field);
      if (schema.additionalProperties === false) {
        for (const k of Object.keys(value)) if (!(k in props)) errors.push('Unexpected field: ' + k);
      }
      for (const [key, propSchema] of Object.entries(props)) {
        if (key in value) {
          const r = validate(propSchema, value[key]);
          if (!r.valid) errors.push(...r.errors.map((e) => key + ': ' + e));
        }
      }
    } else if (type === 'string') {
      if (typeof value !== 'string') errors.push('Expected string, got ' + typeof value);
    } else if (type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) errors.push('Expected number, got ' + typeof value);
    } else if (type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) errors.push('Expected integer, got ' + typeof value);
    } else if (type === 'boolean') {
      if (typeof value !== 'boolean') errors.push('Expected boolean, got ' + typeof value);
    } else if (type === 'array') {
      if (!Array.isArray(value)) errors.push('Expected array, got ' + typeof value);
      else if (schema.items) {
        value.forEach((item, i) => {
          const r = validate(schema.items, item);
          if (!r.valid) errors.push(...r.errors.map((e) => '[' + i + ']: ' + e));
        });
      }
    }
    return { valid: errors.length === 0, errors };
  };
  return validate(schema, value);
}
