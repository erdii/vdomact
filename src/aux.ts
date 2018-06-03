import { Component } from "./lib";

const CONTEXT_LOOKUP = new Map();

export interface IContextConsumerProps {
	render: (...args: any[]) => any;
}

export function createContext() {
	const contextSymbol = Symbol();

	const Provider = class ContextProvider extends Component {
		constructor(props: any) {
			super(props);
			// TODO: throw if contextSymbol is already in use
			CONTEXT_LOOKUP.set(contextSymbol, this);
		}

		public componentWillUnmount() {
			CONTEXT_LOOKUP.delete(contextSymbol);
		}

		public render() {
			return this.props.children;
		}

		public getContext() {
			const context = {
				...this.props,
			};

			delete context.children;

			return context;
		}
	}

	const Consumer = class ContextConsumer extends Component<IContextConsumerProps> {
		public render() {
			return this.props.render(CONTEXT_LOOKUP.get(contextSymbol).getContext());
		}
	}

	return {
		Provider,
		Consumer,
	};
}
