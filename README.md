# truth-sourcer

Custom element feature that manages source of truth attributes.

With the advent of custom state that can be set via internals, the need to reflect properties to attributes has greatly diminished.  In the view of this package, ideally attributes should be used only for initial configuration sent via server-side rendering.

However, there are some limited use cases where "source of truth" attributes are still needed, so this package contains the world's first "custom element feature" to help manage such attributes, where the value of the attribute exactly mirrors a property with the same name and vice versa.

To use this feature, say you are defining your custom element:


```JavaScript
import {TruthSourcer} from 'truth-sourcer/TruthSourcer.js';
import 'assign-gingerly/assignFeatures.js';

class MyElement extends HTMLElement {
    /**
     * @type {EventTarget}
     **/
    propagator = new EventTarget();

    static supportedFeatures = {
        truthSourcer: {
            fallbackSpawn: TruthSourcer,
            getSharedContext(instance) {
                return {
                    hostPropagator: instance.propagator
                };
            }
        }
    };

    /**
     * @type {string}
     **/
    #name = '';

    get name(){
        return this.#name;
    }

    set name(nv){
        this.#name = nv;
        this.propagator.dispatchEvent(new Event('name'));
    }

    static observedAttributes = ['name'];

    attributeChangedCallback(name, oldValue, newValue){
        this.truthSourcer.attributeChangedCallback(name, oldValue, newValue);
    }
}

customElements.assignFeatures(MyElement, {
    truthSourcer: {
        spawn: TruthSourcer,
        callbackForwarding: ['attributeChangedCallback']
    }
});

customElements.define('my-element', MyElement);
```

Note: `callbackForwarding: ['attributeChangedCallback']` means the host's `attributeChangedCallback` is automatically forwarded to the feature. The manual delegation shown above (`this.truthSourcer.attributeChangedCallback(...)`) is only needed if you are NOT using `callbackForwarding`. When using `callbackForwarding`, the consumer can omit `attributeChangedCallback` entirely:

```JavaScript
import {TruthSourcer} from 'truth-sourcer/TruthSourcer.js';
import 'assign-gingerly/assignFeatures.js';

class MyElement extends HTMLElement {
    /**
     * @type {EventTarget}
     **/
    propagator = new EventTarget();

    static supportedFeatures = {
        truthSourcer: {
            fallbackSpawn: TruthSourcer,
            getSharedContext(instance) {
                return {
                    hostPropagator: instance.propagator
                };
            }
        }
    };

    /**
     * @type {string}
     **/
    #name = '';

    get name(){
        return this.#name;
    }

    set name(nv){
        this.#name = nv;
        this.propagator.dispatchEvent(new Event('name'));
    }

    static observedAttributes = ['name'];
}

customElements.assignFeatures(MyElement, {
    truthSourcer: {
        spawn: TruthSourcer,
        callbackForwarding: ['attributeChangedCallback']
    }
});

customElements.define('my-element', MyElement);
```

## How it works

1. **`getSharedContext`** provides the host's `propagator` (EventTarget) to TruthSourcer at spawn time — no manual wiring needed in the constructor.
2. **`callbackForwarding: ['attributeChangedCallback']`** automatically forwards the host's `attributeChangedCallback` to TruthSourcer, so attribute changes sync to properties without any boilerplate.
3. **Property → Attribute**: When the host sets a property and dispatches an event on the propagator, TruthSourcer catches it and calls `setAttribute` (or `removeAttribute` for booleans/nulls).
4. **Attribute → Property**: When an attribute changes, TruthSourcer coerces the string value to the correct type (inferred from the property's current value) and sets it on the host.
5. A `#syncing` flag prevents infinite loops between the two directions.

## Restrictions

Even though attributes are case insensitive, to inform truthSourcer the name of the property corresponding to the attribute, make sure `observedAttributes` gives the name of the property with proper casing.  This essentially means no "dash" support for such source of truth attributes.  

Recommendation is to limit such cases to attributes supported natively by the platform (such as "name").

The property values have to be initialized to non-null values, so that truthSourcer can infer the type that the property should take (string, boolean, number).  This pretty much mirrors how the platform handles source of truth attributes.
