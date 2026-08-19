export const handler = async (event: any, context: any) => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  // Allow OPTIONS preflight requests through without authorization
  const httpMethod = extractHttpMethod(event.methodArn);
  if (httpMethod === 'OPTIONS') {
    return generatePolicy('anonymous', 'Allow', event.methodArn);
  }

  const token = event.authorizationToken || event.headers?.Authorization || event.headers?.authorization;

  if (!token) {
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }

  try {
    const tokenValue = token.replace(/^Bearer\s+/i, '');

    // Decode the JWT payload (base64url)
    const payload = JSON.parse(
      Buffer.from(tokenValue.split('.')[1], 'base64url').toString('utf-8')
    );

    console.log('Token payload:', JSON.stringify(payload, null, 2));

    const groups: string[] = payload['cognito:groups'] || [];
    const httpMethod = extractHttpMethod(event.methodArn);

    // Map groups to allowed methods
    // calendar:view   -> GET
    // calendar:create -> POST
    // calendar:edit   -> PUT
    // calendar:delete -> DELETE
    const allowedMethods: string[] = [];
    if (groups.includes('calendar:view')) {
      allowedMethods.push('GET');
    }
    if (groups.includes('calendar:create')) {
      allowedMethods.push('POST');
    }
    if (groups.includes('calendar:edit')) {
      allowedMethods.push('PUT');
    }
    if (groups.includes('calendar:delete')) {
      allowedMethods.push('DELETE');
    }

    if (!httpMethod || allowedMethods.includes(httpMethod)) {
      return generatePolicy(payload.sub, 'Allow', event.methodArn, {
        tenant_id: payload['custom:tenant_id'] || '',
        email: payload.email || '',
        username: payload['cognito:username'] || '',
        groups: groups.join(','),
      });
    }

    return generatePolicy(payload.sub, 'Deny', event.methodArn);
  } catch (error) {
    console.error('Authorization error:', error);
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }
};

function extractHttpMethod(methodArn: string): string | null {
  // arn:aws:execute-api:region:account:api-id/stage/METHOD/resource
  const parts = methodArn.split('/');
  return parts.length >= 3 ? parts[2] : null;
}

function generatePolicy(
  principalId: string,
  effect: string,
  resource: string,
  context?: Record<string, string>
) {
  const policy: any = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };

  if (context) {
    policy.context = context;
  }

  return policy;
}
