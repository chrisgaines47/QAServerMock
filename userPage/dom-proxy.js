
const dom = new Proxy({}, {
  get: (target, key, receiver) => (attrs = {}, children = [], evts = {}) => {
    let attributes_passed = !(attrs instanceof Array) && !(attrs instanceof Element);
    if (!attributes_passed) {
      evts = children;
      children = attrs;
    }

    if(children instanceof Element)
      children = [children];

    if (typeof children === "string" && (!attributes_passed || Object.keys(attrs).length === 0))
      return children;

    let shouldInsert = child => ["string", "boolean", "number"].includes(typeof child);
    var el = document.createElement(key);

    for (let child of children)
      if (shouldInsert(child))
        el.insertAdjacentHTML("beforeend", child);
      else
        if (child instanceof Array)
          child.forEach(c => shouldInsert(c) ? el.insertAdjacentHTML("beforeend", c) : el.appendChild(c));
        else
          el.appendChild(child);

    if (attributes_passed)
      for (let key in attrs)
        if(key !== 'model' && key !== 'key')
          el.setAttribute(key, attrs[key]);

    for (let evt in evts)
      if (evt == "after")
        evts[evt](el);
      else
        el.addEventListener(evt, evts[evt]);

    var shouldAttachModel = ["INPUT", "TEXTAREA", "SELECT"].includes(el.nodeName);
    if(shouldAttachModel && attributes_passed && attrs.model && attrs.modelkey) {
      el.addEventListener('change', function(evt) {
        attrs.model[attrs.modelkey] = el.getAttribute('type') === "checkbox" ? evt.target.checked : evt.target.value;
      })
    }

    return el;
  }
});