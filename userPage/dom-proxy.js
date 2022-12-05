
const dom = new Proxy({}, {
  get: (target, key, receiver) => (attrs = {}, children = [], evts = {}) => {
    //when attributes are not passed, we expect the first parameter to contain the
    //child nodes to append to the created element
    //this allows us to write dom.div([children]) instead of dom.div({},[children])
    let attributes_passed = !(attrs instanceof Array) && !(attrs instanceof Element);
    if (!attributes_passed) {
      evts = children;
      children = attrs;
    }

    //allow us to pass a singular dom element as well as an array
    //dom.div(dom.i()) instead of dom.div([dom.i()])
    if(children instanceof Element)
      children = [children];

    //strings can just be added directly into the element (done as text nodes)
    if (typeof children === "string" && (!attributes_passed || Object.keys(attrs).length === 0))
      return children;

    //strings, boolean, and numbers should be inserted as raw HTML
    let shouldInsert = child => ["string", "boolean", "number"].includes(typeof child);
    var el = document.createElement(key);

    //insert raw HTML for string, boolean, number types, insert child for dom elements
    for (let child of children)
      if (shouldInsert(child))
        el.insertAdjacentHTML("beforeend", child);
      else
        if (child instanceof Array)
          child.forEach(c => shouldInsert(c) ? el.insertAdjacentHTML("beforeend", c) : el.appendChild(c));
        else
          el.appendChild(child);

    //set all passed attributed except for our model binds
    if (attributes_passed)
      for (let key in attrs)
        if(key !== 'model' && key !== 'modelkey')
          el.setAttribute(key, attrs[key]);
      
    if ('checked' in attrs) {
      el.checked = attrs.checked;
    }

    //hooks upstream binding up to our model
    var shouldAttachModel = ["INPUT", "TEXTAREA", "SELECT"].includes(el.nodeName);
    if(shouldAttachModel && attributes_passed && attrs.model && attrs.modelkey) {
      el.addEventListener('change', function(evt) {
        if(el.getAttribute('type') === "checkbox") {
          attrs.model[attrs.modelkey] = evt.target.checked;
        } else if(el.nodeName === "SELECT") {
          attrs.model[attrs.modelkey] = parseInt(evt.target.value) ? parseInt(evt.target.value) : evt.target.value;
        } else {
          attrs.model[attrs.modelkey] = evt.target.value;
        }
      })
    }

    //attach event listeners and "after" which runs some function on the element after its created
    for (let evt in evts)
      if (evt == "after")
        evts[evt](el);
      else
        el.addEventListener(evt, evts[evt]);
    return el;
  }
});