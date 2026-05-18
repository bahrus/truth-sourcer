// @ts-check
/** @import {TruthSourcerProps, AllProps, FeatureSpawnContext} from './types/truth-sourcer/types' */

/**
 * Custom element feature that manages "source of truth" attributes.
 * Keeps attribute values in sync with their corresponding properties
 * and vice versa.
 * 
 * @implements {TruthSourcerProps}
 */
class TruthSourcer {
    /** @type {WeakRef<HTMLElement> | null} */
    #hostRef = null;

    /** @type {string[]} */
    #observedAttributes = [];

    /** @type {AbortController | null} */
    #abortController = null;

    /** @type {EventTarget | null} */
    #hostPropagator = null;

    /** @type {boolean} */
    #syncing = false;

    /**
     * @param {HTMLElement} hostElement
     * @param {FeatureSpawnContext} ctx
     * @param {Partial<TruthSourcerProps>} [initVals]
     */
    constructor(hostElement, ctx, initVals) {
        this.#hostRef = new WeakRef(hostElement);
        const ctor = /** @type {any} */ (hostElement.constructor);
        this.#observedAttributes = ctor.observedAttributes || [];

        // Get hostPropagator from shared context (provided by getSharedContext)
        const propagator = ctx?.shared?.hostPropagator;
        if (propagator) {
            this.hostPropagator = propagator;
        }

        if (initVals) {
            if (initVals.hostPropagator) {
                this.hostPropagator = initVals.hostPropagator;
            }
        }
    }

    /**
     * The EventTarget the host uses to dispatch property change events.
     * Setting this subscribes TruthSourcer to property change events
     * for all observedAttributes.
     */
    get hostPropagator() {
        return this.#hostPropagator;
    }

    /**
     * @param {EventTarget | null} nv
     */
    set hostPropagator(nv) {
        // Clean up previous listeners
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }

        this.#hostPropagator = nv;

        if (nv) {
            this.#abortController = new AbortController();
            const signal = this.#abortController.signal;

            for (const attrName of this.#observedAttributes) {
                nv.addEventListener(attrName, () => {
                    this.#syncPropertyToAttribute(attrName);
                }, { signal });
            }
        }
    }

    /**
     * Called via callbackForwarding from the host element's attributeChangedCallback.
     * Syncs the attribute value into the corresponding property.
     * 
     * @param {string} name - The attribute name
     * @param {string | null} oldValue - Previous attribute value
     * @param {string | null} newValue - New attribute value
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (this.#syncing) return;

        const host = this.#hostRef?.deref();
        if (!host) return;

        const currentValue = /** @type {any} */ (host)[name];
        const coerced = this.#coerce(newValue, currentValue);

        if (coerced !== currentValue) {
            this.#syncing = true;
            /** @type {any} */ (host)[name] = coerced;
            this.#syncing = false;
        }
    }

    /**
     * Syncs a property value to its corresponding attribute.
     * @param {string} attrName
     */
    #syncPropertyToAttribute(attrName) {
        if (this.#syncing) return;

        const host = this.#hostRef?.deref();
        if (!host) return;

        const value = /** @type {any} */ (host)[attrName];
        this.#syncing = true;

        switch(typeof value){
            case 'boolean':
            case 'string':
                if (value) {
                    host.setAttribute(attrName, '');
                } else {
                    host.removeAttribute(attrName);
                }
                break;
            default:
                if (value == null) {
                    host.removeAttribute(attrName);
                } else {
                    host.setAttribute(attrName, String(value));
                }
        }

        this.#syncing = false;
    }

    /**
     * Coerces an attribute string value to the appropriate type
     * based on the current property value's type.
     * 
     * @param {string | null} attrValue
     * @param {any} currentValue - Used to infer the target type
     * @returns {any}
     */
    #coerce(attrValue, currentValue) {
        if (attrValue === null) {
            // Attribute removed
            if (typeof currentValue === 'boolean') return false;
            if (typeof currentValue === 'number') return 0;
            return '';
        }

        switch (typeof currentValue) {
            case 'boolean':
                // Presence of attribute = true (standard HTML behavior)
                return true;
            case 'number':
                return Number(attrValue);
            default:
                return attrValue;
        }
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }
        this.#hostRef = null;
        this.#hostPropagator = null;
    }
}

export { TruthSourcer };
