// Implementação simplificada do EventEmitter para comunicação entre componentes e serviços
class EventEmitter {
    private listeners: { [key: string]: Function[] } = {};

    on(event: string, callback: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event: string, callback: Function) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event: string, ...args: any[]) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(...args));
    }
}

// Emissor global
export const appEvents = new EventEmitter();

// Constantes de eventos
export const APP_EVENTS = {
    DATA_CHANGED: 'DATA_CHANGED',
    RESTORE_COMPLETED: 'RESTORE_COMPLETED',
};
