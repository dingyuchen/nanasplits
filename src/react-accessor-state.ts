import { useState, type Dispatch, type SetStateAction } from "react";

export function useAccessorState<T>(
	initialValue: T | (() => T),
): [() => T, Dispatch<SetStateAction<T>>] {
	const [value, setValue] = useState(initialValue);
	return [() => value, setValue];
}
