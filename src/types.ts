export type TMountNode = Node|Element;
export type TParentNode = TMountNode|null;

export interface IComponentProps {
	children?: any;
}

export interface IContextProviderProps<T> {
	value: T;
}
export interface IContextConsumerProps<T> {
	children: (value: T) => any;
}
