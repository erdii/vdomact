import {
	TMountNode,
	TParentNode,
	IComponentProps,
} from "./types";

export const KEY_SYMBOL = Symbol();
export const INSTANCE_SYMBOL = Symbol();
export const HANDLER_SYMBOL = Symbol();

export function createElement(type: string, props: any, ...children: any[]) {
	return {
		type,
		props: props || {},
		children,
	};
}

export function setAttribute(dom: any, key: any, value: any) {
	if (typeof value === "function" && key.startsWith("on")) {
		const eventType = key.slice(2).toLowerCase();
		dom[HANDLER_SYMBOL] = dom[HANDLER_SYMBOL] || {};
		dom.removeEventListener(eventType, dom[HANDLER_SYMBOL][eventType]);
		dom[HANDLER_SYMBOL][eventType] = value;
		dom.addEventListener(eventType, dom[HANDLER_SYMBOL][eventType]);
	} else if (key === "checked" || key === "value" || key === "className") {
		dom[key] = value;
	} else if (key === "key") {
		dom[KEY_SYMBOL] = value;
	} else if (key === "style" && typeof value === "object") {
		// can we do this more efficiently?
		for (const prop in value) {
			dom.style[prop] = value[prop];
		}
	} else if (key === "dangerouslySetInnerHTML" && typeof value === "string") {
		dom.innerHTML = value;
	} else if (key === "ref" && typeof value === "function") {
		value(dom);
	} else if (typeof value !== "object" && typeof value !== "function") {
		dom.setAttribute(key, value);
	}
}

export function render(vdom: any, parent: TParentNode = null): TMountNode {
	const mount = parent
		? ((el: TMountNode) => parent.appendChild(el))
		: ((el: TMountNode) => el);

	const typeofVdom = typeof vdom;

	if (typeofVdom === "number" || typeofVdom === "string") {
		return mount(document.createTextNode(vdom));
	}

	if (typeofVdom === "boolean" || vdom === null) {
		return mount(document.createTextNode(""));
	}

	if (typeof vdom == "object" && typeof vdom.type == "function") {
		return Component.render(vdom, parent);
	}

	if (typeof vdom === "object" && typeof vdom.type === "string") {
		const dom = mount(document.createElement(vdom.type));

		for (const child of [/* flatten */].concat(...vdom.children)) {
			render(child, dom);
		}

		for (const prop in vdom.props) {
			setAttribute(dom, prop, vdom.props[prop]);
		}

		return dom;
	}

	throw new Error(`Invalid VDOM: ${vdom}.`);
}

export function patch(dom: HTMLElement|Text, vdom: any, parent = dom.parentNode): TMountNode|undefined {
	const replace = parent
		? ((el: any) => (parent.replaceChild(el, dom) && el))
		: ((el: any) => el);

	const typeofVdom = typeof vdom;

	if (typeofVdom === "object" && typeof vdom.type === "function") {
		return Component.patch(dom, vdom, parent);
	}

	if (typeofVdom !== "object" && dom instanceof Text) {
		return dom.textContent != vdom
			? replace(render(vdom, parent))
			: dom;
	}

	if (typeofVdom === "object" && dom instanceof Text) {
		return replace(render(vdom, parent));
	}

	// replace if type changed
	if (typeofVdom === "object" && dom.nodeName !== vdom.type.toUpperCase()) {
		return replace(render(vdom, parent));
	}

	if (typeofVdom === "object" && dom.nodeName === vdom.type.toUpperCase()) {
		const pool: any = {};
		const active = document.activeElement;

		for (const index in Array.from(dom.childNodes)) {
			const child = dom.childNodes[index];
			const key = (child as any)[KEY_SYMBOL] || index;
			pool[key] = child;
		}

		const vchildren = [/* flatten */].concat(...vdom.children);

		for (const index in vchildren) {
			const child = vchildren[index];
			const key = (child as any).props && (child as any).props.key || index;

			if (pool[key] !== undefined) {
				patch(pool[key], child);
			}

			if (pool[key] === undefined) {
				render(child, dom);
			}

			delete pool[key];
		}

		// remove old dom nodes
		for (const key in pool) {
			if (pool[key][INSTANCE_SYMBOL]) {
				pool[key][INSTANCE_SYMBOL].componentWillUnMount();
			}
			pool[key].remove();
		}

		for (const attr of (dom as any).attributes) {
			(dom as any).removeAttribute(attr.name);
		}

		for (const prop in vdom.props) {
			setAttribute(dom, prop, vdom.props[prop]);
		}

		(active as HTMLElement).focus();

		return dom;
	}
}

export class Component<P = any, S = any> {
	props: P & IComponentProps;
	state: S;
	base?: TMountNode;

	constructor(props: P & IComponentProps) {
		this.props = props || {};
		this.state = null as any;
	}

	static render(vdom: any, parent: TParentNode = null) {
		const props = {
			...vdom.props,
			children: vdom.children,
		};

		if (Component.isPrototypeOf(vdom.type)) {
			const instance = new (vdom.type)(props);
			instance.componentWillMount();
			instance.base = render(instance.render(), parent);
			instance.base[INSTANCE_SYMBOL] = instance;
			instance.base[KEY_SYMBOL] = vdom.props.key;
			instance.componentDidMount();
			return instance.base;
		} else {
			return render(vdom.type(props), parent);
		}
	}

	static patch(dom: HTMLElement|Text, vdom: any, parent = dom.parentNode) {
		const props = {
			...vdom.props,
			children: vdom.children,
		};

		if ((dom as any)[INSTANCE_SYMBOL] && (dom as any)[INSTANCE_SYMBOL].constructor === vdom.type) {
			(dom as any)[INSTANCE_SYMBOL].componentWillReceiveProps(props);
			(dom as any)[INSTANCE_SYMBOL].props = props;
			return patch(dom, (dom as any)[INSTANCE_SYMBOL].render(), parent);
		}

		if (Component.isPrototypeOf(vdom.type)) {
			const ndom = Component.render(vdom, parent);
			return parent
				? (parent.replaceChild(ndom, dom) && ndom)
				: (ndom);
		} else {
			return patch(dom, vdom.type(props), parent);
		}
	}

	public setState(nextState: S) {
		if (this.base && this.shouldComponentUpdate(this.props, nextState)) {
			const prevState = this.state;
			this.componentWillUpdate(this.props, nextState);
			this.state = nextState;
			patch((this.base as any), this.render());
			this.componentDidUpdate(this.props, prevState);
		} else {
			this.state = nextState;
		}
	}

	public componentWillMount() {
		return;
	}

	public componentDidMount() {
		return;
	}

	public shouldComponentUpdate(nextProps: P, nextState: S) {
		return nextProps !== this.props || nextState !== this.state;
	}

	public componentWillReceiveProps(nextProps: P) {
		return;
	}

	public componentWillUpdate(nextProps: P, nextState: S) {
		return;
	}

	public render() {
		return undefined as any;
	}

	public componentDidUpdate(prevProps: P, preState: S) {
		return;
	}

	public componentWillUnmount() {
		return;
	}
}
