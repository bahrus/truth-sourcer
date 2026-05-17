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
            callbackForwarding: ['connectedCallback', 'attributeChangedCallback'],
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
    truthSourcer: { spawn: TruthSourcer }
});

customElements.define('my-element', MyElement);
```

## How it works

1. **`getSharedContext`** provides the host's `propagator` (EventTarget) to TruthSourcer at spawn time — no manual wiring needed in the constructor.
2. **`callbackForwarding: ['attributeChangedCallback']`** in `supportedFeatures` declares that this feature needs `attributeChangedCallback` forwarded. The framework patches the host's callback automatically — no manual delegation needed.
3. **Property → Attribute**: When the host sets a property and dispatches an event on the propagator, TruthSourcer catches it and calls `setAttribute` (or `removeAttribute` for booleans/nulls).
4. **Attribute → Property**: When an attribute changes, TruthSourcer coerces the string value to the correct type (inferred from the property's current value) and sets it on the host.
5. A `#syncing` flag prevents infinite loops between the two directions.

Since `callbackForwarding` is specified in `supportedFeatures`, the element author doesn't need to write `attributeChangedCallback` at all — the forwarding is guaranteed regardless of what the injector provides (a union is taken between `supportedFeatures` and the injection config).

## Restrictions

Even though attributes are case insensitive, to inform truthSourcer the name of the property corresponding to the attribute, make sure `observedAttributes` gives the name of the property with proper casing.  This essentially means no "dash" support for such source of truth attributes.  

Recommendation is to limit such cases to attributes supported natively by the platform (such as "name").

The property values have to be initialized to non-null values, so that truthSourcer can infer the type that the property should take (string, boolean, number).  This pretty much mirrors how the platform handles source of truth attributes.

## Viewing Demos Locally

1. Install git
2. Fork/clone this repo
3. Install node.js
4. Open command window to folder where you cloned this repo
5. > git submodule add https://github.com/bahrus/types.git types
6. > git submodule update --init --recursive
7. > npm install
8. > npm run serve
9. Open http://localhost:8000/ in a modern browser

## Running Tests

```
> npm run test
```

## Using from ESM Module:

```JavaScript
import 'truth-sourcer/TruthSouurcer.js';
```

## Using from CDN:

```html
<script type=module crossorigin=anonymous>
    import 'https://esm.sh/truth-sourcer';
</script>
```

