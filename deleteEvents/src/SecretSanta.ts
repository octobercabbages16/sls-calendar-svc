import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class SecretSanta {

    public async getSecret(): Promise<any> {
        const client = new SecretsManagerClient({});
        const command = new GetSecretValueCommand({
            SecretId: process.env.SECRET_NAME,
        });
        return await client.send(command);
    }
}
