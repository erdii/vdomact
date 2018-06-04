import { Component } from "./lib";
import { IComponentProps, IContextProviderProps, IContextConsumerProps } from "./types";

const CONTEXT_LOOKUP = new Map();

export function createContext<T = any>() {
	const contextSymbol = Symbol();

	const Provider = class ContextProvider extends Component<IContextProviderProps<T>> {
		constructor(props: IContextProviderProps<T>) {
			super(props);

			// throw if contextSymbol is already in use
			if (CONTEXT_LOOKUP.has(contextSymbol)) {
				throw new Error("CONTEXT_PROVIDER_CANNOT_BE_MOUNTED_MORE_THAN_ONCE_AT_A_TIME");
			}

			// register provider in lookup map
			CONTEXT_LOOKUP.set(contextSymbol, this);
		}

		public componentWillUnmount() {
			// unregister provider from lookup map
			CONTEXT_LOOKUP.delete(contextSymbol);
		}

		public render() {
			return this.props.children;
		}

		public getContext() {
			return this.props.value;
		}
	}

	const Consumer = class ContextConsumer extends Component<IContextConsumerProps<T>> {
		public render() {
			return this.props.children(CONTEXT_LOOKUP.get(contextSymbol).getContext());
		}
	}

	return {
		Provider,
		Consumer,
	};
}
