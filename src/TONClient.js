// @flow
/* eslint-disable class-methods-use-this, no-use-before-define */
import TONQueriesModule from "./modules/TONQueriesModule";
import TONConfigModule from './modules/TONConfigModule';
import TONContractsModule from './modules/TONContractsModule';
import TONCryptoModule from './modules/TONCryptoModule';

import { TONModule } from './TONModule';

import type {
    TONModuleContext,
    TONClientLibrary,
} from './TONModule';

export type TONClientError = {
    source: string,
    code: number,
    message: string,
}

export const TONClientErrorSource = {
    sdk: 'sdk',
    tvm: 'tvm',
    stdlib: 'stdlib',
    contract: 'contract'
};

class ModuleContext implements TONModuleContext {
    modules: Map<string, TONModule>;


    constructor() {
        this.modules = new Map();
    }

    optionalLibrary(): ?TONClientLibrary {
        return TONClient.library;
    }

    getModule<T>(ModuleClass: typeof TONModule): T {
        const name = ModuleClass.moduleName;
        const existingModule = this.modules.get(name);
        if (existingModule) {
            return (existingModule: any);
        }
        const module = new ModuleClass(this);
        this.modules.set(name, module);
        return (module: any);
    }
}


type TONClientPlatform = {
    fetch: any,
    WebSocket: any,
    createLibrary: () => Promise<TONClientLibrary>,
};

export class TONClient {
    static shared = new TONClient();

    static setLibrary(clientPlatform: TONClientPlatform) {
        TONClient.clientPlatform = clientPlatform;
    }


    // Public
    config: TONConfigModule;
    crypto: TONCryptoModule;
    contracts: TONContractsModule;
    queries: TONQueriesModule;


    constructor() {
        this.context = new ModuleContext();
        this.config = this.context.getModule(TONConfigModule);
        this.crypto = this.context.getModule(TONCryptoModule);
        this.contracts = this.context.getModule(TONContractsModule);
        this.queries = this.context.getModule(TONQueriesModule);
    }


    async setup(): Promise<void> {
        if (!TONClient.library) {
            if (!TONClient.clientPlatform) {
                return;
            }
            TONClient.library = await TONClient.clientPlatform.createLibrary();
        }
        const modules: TONModule[] = [...this.context.modules.values()];
        for (const module of modules) {
            await module.setup();
        }
    }

    async close(): Promise<void> {
        await this.queries.close();
    }


    // Modules
    requiredModule<T>(ModuleClass: typeof TONModule): T {
        return this.context.getModule<T>(ModuleClass);
    }


    // Internals
    static clientPlatform: ?TONClientPlatform = null;
    static library: ?TONClientLibrary = null;

    context: ModuleContext;
}