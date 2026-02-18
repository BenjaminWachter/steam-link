declare module 'steamapi-node' {
    export class SteamUser {
        constructor(key: string, cache?: any, endpoints?: any[]);
        others: {
            resolve(input: string): Promise<any>;
        };
        users: any;
        games: any;
    }
    
    export class Games {}
    export class Users {}
    export class Others {}
}