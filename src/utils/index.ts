import { GuildMember } from "discord.js";

namespace Utils {
	export function entries<A extends string | number | symbol, B>(object: Partial<Record<A, B>>): [A, B][] {
		let array: [A, B][] = [];
		for (const key in object) {
			const value = object[key];

			array.push([key, value as B]);
		}
		return array;
	}
	export function keys<A extends string | number | symbol>(object: Partial<Record<A, any>>): A[] {
		let array: A[] = [];
		for (const key in object) {
			array.push(key);
		}
		return array;
	}
	export function values<A>(object: Partial<Record<any, A>>): A[] {
		let array: A[] = [];
		for (const key in object) {
			let value = object[key];
			if (!value) continue;

			array.push(value);
		}
		return array;
	}
	export function find<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => boolean | void): [A, B] | undefined {
		let entries = Utils.entries(object);
		let found = entries.find((value, index) => callback.call(null, value[0], value[1], index));
		return found;
	}
	export function findKey<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => boolean | void): A | undefined {
		let found = find(object, callback);
		return found == undefined ? undefined : found[0];
	}
	export function findValue<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => boolean | void): B | undefined {
		let found = find(object, callback);
		return found == undefined ? undefined : found[1];
	}
	export function filter<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => boolean | void): Partial<Record<A, B>> {
		let filtered = Utils.entries(object).filter((value, index) => callback.call(null, value[0], value[1], index));
		let newRecord: Partial<Record<A, B>> = {};
		filtered.forEach(value => newRecord[value[0]] = value[1]);
		return newRecord;
	}
	export function mapRecord<A extends string | number | symbol, B, C extends string | number | symbol, D>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => [C, D]): Partial<Record<C, D>> {
		let mapped: Partial<Record<C, D>> = {};
		Utils.entries(object).forEach((value, index) => {
			let newItem = callback.call(null, value[0], value[1], index);
			mapped[newItem[0]] = newItem[1];
		})
		return mapped;
	}
	export function mapRecordKeys<A extends string | number | symbol, B, C extends string | number | symbol>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => C): Partial<Record<C, B>> {
		return Utils.mapRecord(object, (key, value, index) => [callback.call(null, key, value, index), value]);
	}
	export function mapRecordValues<A extends string | number | symbol, B, D>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => D): Partial<Record<A, D>> {
		return Utils.mapRecord(object, (key, value, index) => [key, callback.call(null, key, value, index)]);
	}
	export function map<A extends string | number | symbol, B, C>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => C): C[] {
		let mapped: C[] = [];
		Utils.entries(object).forEach((value, index) => {
			let newItem = callback.call(null, value[0], value[1], index);
			mapped.push(newItem);
		})
		return mapped;
	}
	export function forEachRecord<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => void) {
		Utils.entries(object).forEach((value, index) => callback.call(null, value[0], value[1], index));
	}
	export function everyRecord<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => boolean | void): boolean {
		const entries = Utils.entries(object);
		if (!entries.length) return false;

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			let result = callback.call(null, entry[0], entry[1], i) ?? false;
			if (result === false) return false;
		}
		return true;
	}
	export function someRecord<A extends string | number | symbol, B>(object: Partial<Record<A, B>>, callback: (key: A, value: B, index: number) => boolean | void): boolean {
		const entries = Utils.entries(object);
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			let result = callback.call(null, entry[0], entry[1], i) ?? false;
			if (result === true) return true;
		}
		return false;
	}
	export function shiftRecord<A extends string | number | symbol, B>(object: Partial<Record<A, B>>): undefined | [A, B] {
		const entries = Utils.entries(object);
		if (entries.length == 0) return undefined;

		let next = entries[0];
		return delete object[next[0]] ? next : undefined;
	}

	export function forLoop<A>(loop: number, callback: (index: number) => A): A[] {
		let array: A[] = [];
		for (let i = 0; i < loop; i++) {
			array.push(callback(i));
		}
		return array;
	}

	export function capitalizeString<K extends string>(string: K): Capitalize<K> {
		return (string.charAt(0).toUpperCase() + string.substring(1)) as Capitalize<K>;
	}

	export function randomToken(n: number, includeSymbols: boolean = false): string {
		const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + (includeSymbols ? '~`!@#$%^&*()_-+={[}]|\\:;"\'<,>.?/' : '');
		let tokenBuilder = '';
		for (let i = 0; i < n; i++) {
			tokenBuilder += CHARS[Math.floor(Math.random() * CHARS.length)];
		}
		return tokenBuilder;
	}

	export const ConsoleStyles = {
		Reset: "\x1b[0m",
		TextStyle: {
			Bold: "\x1b[1m",
			Dim: "\x1b[2m",
		},

		TextColors: {
			Red: "\x1b[31m",
			Green: "\x1b[32m",
			Yellow: "\x1b[33m",
			Blurple: "\x1b[34m",
			Magenta: "\x1b[35m",
			Aqua: "\x1b[36m"
		},

		TextBackground: {
			Black: "\x1b[40m",
			Red: "\x1b[41m",
			Green: "\x1b[42m",
			Yellow: "\x1b[43m",
			Blurple: "\x1b[44m",
			Magenta: "\x1b[45m",
			Aqua: "\x1b[46m",
			White: "\x1b[47m"
		}

	};

	export function parseInteger<K = number>(parseValue: string | number | undefined | null | boolean, defaultValue: K = NaN as K): number | K {
		if (parseValue == null || parseValue == undefined) return defaultValue;
		if (typeof parseValue == 'boolean') return parseValue ? 1 : 0;
		if (typeof parseValue == 'number') return parseValue;

		let parsedValue = parseInt(parseValue);
		return isNaN(parsedValue) ? defaultValue : parsedValue;
	}

	type TimeUnits = 'year' | 'day' | 'hour' | 'minute' | 'second';
	export function formatTime(time: number | Date, shortUnits: (boolean | ((ms: number) => boolean)) = true, omitExtraUnits: boolean = true, highestUnit: boolean = false, units?: Partial<Record<TimeUnits, [string, string, string]>>): string {
		const ms = typeof time == 'number' ? time : time.getTime();
		const _short = typeof shortUnits == 'boolean' ? shortUnits : shortUnits.call(null, ms);

		const years = Math.floor(ms / 31536000000);
		const days = Math.floor((ms % 31536000000) / 86400000);
		const hours = Math.floor((ms % 86400000) / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);

		if (ms < 1000) return `0${shortUnits ? 's' : ' seconds'}`;

		let stop = false;
		let ignoreOmitExtra = false;
		const unit = (time: number, unit: TimeUnits): string => {
			if ((time == 0 && omitExtraUnits && !ignoreOmitExtra) || stop) return '';
			ignoreOmitExtra = true;

			if (time != 0 && highestUnit) stop = true;

			const custom_unit = units && units[unit] ? Utils.numeralDeclension(time, ...units[unit]) : null;
			if (custom_unit) return `${time} ${custom_unit}`;

			if (_short) return `${time}${unit.charAt(0)} `;
			return `${time} ${unit}${time > 1 || time == 0 ? 's' : ''} `
		}

		return (unit(years, 'year') + unit(days, 'day') + unit(hours, 'hour') + unit(minutes, 'minute') + unit(seconds, 'second')).trim();
	}

	export function num2bin(n: number): string {
		return (n >>> 0).toString(2);
	}
	export function bin2num(bin: number | string): number {
		return parseInt(bin.toString(), 2);
	}

	export function mapString(string: string, callback: (char: string, current: string, index: number, defaultString: string) => string | void | false): string {
		let builder: string = '';
		for (let i = 0; i < string.length; i++) {
			const char = string.charAt(i);
			const newString = callback(char, builder, i, string);
			newString && (builder = newString);
		}
		return builder;
	}

	export function filterString(string: string, callback: (char: string, index: number, defaultString: string) => boolean | void): string {
		return mapString(string, (char, c, i) => (callback(char, i, string) ?? false) ? (c + char) : false);
	}

	export function reverseString(string: string): string {
		return mapString(string, (char, builder) => char + builder);
	}

	export function parseBoolean(boolean: string): boolean {
		const compare = boolean.trim().toLowerCase();
		return compare === 'true' || compare === '1';
	}

	export function stringifyBoolean(boolean: boolean, capitalize: boolean = false, customValues?: { true?: string, false?: string }): string {
		const str = boolean
			? customValues?.true ? (customValues.true) : 'true'
			: customValues?.false ? (customValues.false) : 'false';
		return capitalize ? Utils.capitalizeString(str) : str;
	}

	export function classBuilder(
		...classBuilder: ({ className: string, condition: boolean | ((builder: string, index: number) => boolean) } | string | null | undefined)[]
	): string {

		let builder = '';

		for (let i = 0; i < classBuilder.length; i++) {
			const entry = classBuilder[i];
			if (typeof entry == 'string') {
				let _entry_ = entry.trim();
				if (_entry_ == '') continue;

				builder += ` ${_entry_}`;
				continue;
			}

			const pass = entry && (typeof entry.condition == 'boolean' ? entry.condition : entry.condition(builder, i));
			pass && (builder += ` ${entry.className.trim()}`);
		}

		return builder.trim();
	}

	export function simulateRequest<K>(data: K, delay: number = 10000): Promise<K> {
		return new Promise((resolve) => {
			setTimeout(() => resolve(data), delay);
		})
	}

	/**
	 * ### Rozhodne správný tvar slova odkazující na počet věcí.
	 * @param n 
	 * @param a Jedno **jablko**
	 * @param b Dvě **jablka**
	 * @param c Pět **jablek**
	 */
	export function numeralDeclension(n: number, a: string, b: string, c: string): string {
		if (n == 0) return c;
		if (n == 1) return a;
		if (n > 1 && n < 5) return b;
		return c;
	}

	export function removeDuplicates<A>(array: A[]): A[] {
		let registered: A[] = [];
		return array.filter(value => {
			if (registered.includes(value)) return false;

			registered.push(value);
			return true;
		});
	}

	export function makeArray<K>(length: number, callback: K | ((index: number) => K)) {
		let array: K[] = [];

		for (let i = 0; i < length; i++) {
			if (typeof callback == 'function') {
				array.push((callback as (index: number) => K)(i));
			} else {
				array.push(callback);
			}
		}

		return array;
	}

	export function repeatString(string: string, repeat: number) {
		var builder: string = '';

		for (let i = 0; i < repeat; i++)
				builder += string;

		return builder;
	}

	export function randomNumber(min: number, max: number, decimals: boolean = false): number {
		if (min > max) return NaN;

		let a = Math.random() * (max - min + 1);
		if (!decimals)
			a = Math.floor(a);

		return min + a;
	}

	interface TableGeneratorOptions {
		joinSymbol: string,
		verticalSymbol: string,
		horizontalSymbol: string,
		horizontalPadding: number
	}
	export class TableGenerator {
		private readonly JOIN_SYMBOL: string = 			'+';
		private readonly VERTICAL_SYMBOL: string = 		'|';
		private readonly HORIZONTAL_SYMBOL: string = 	'-';
		private readonly HORIZONTAL_PADDING: number = 	2;

		private columns: string[];
		private rows: string[][];

		constructor(private options?: TableGeneratorOptions) {
			this.columns = [];
			this.rows = [];
		}

		public addColumn(label: string): TableGenerator {
			this.columns.push(label);
			return this;
		}

		public addRow(...row: (number | string | boolean)[]): TableGenerator {
			var string: string[] = row.map(r => r.toString());
			this.rows.push(string);
			return this;
		}

		public build() {
			
			var builder: string = '';
			
			const JOIN_SYMBOL = this.options?.joinSymbol ?? this.JOIN_SYMBOL;
			const VERTICAL_SYMBOL = this.options?.verticalSymbol ?? this.VERTICAL_SYMBOL;
			const HORIZONTAL_SYMBOL = this.options?.verticalSymbol ?? this.HORIZONTAL_SYMBOL;
			const HORIZONTAL_PADDING = this.options?.horizontalPadding ?? this.HORIZONTAL_PADDING;
			const padding = Utils.repeatString(' ', HORIZONTAL_PADDING);

			// Get column widths
			const columnLengths: number[] = [];
			for (let x = 0; x < this.columns.length; x++) {
				const lengths: number[] = [this.columns[x].length + HORIZONTAL_PADDING * 2];

				for (let y = 0; y < this.rows.length; y++) {
					const r = this.rows[y][x];
					if (!r) break;

					lengths.push(r.length + HORIZONTAL_PADDING * 2);
				}

				columnLengths.push(Math.max(...lengths));
			}


			// Build row splitter
			var rowSplitter: string = JOIN_SYMBOL;
			for (let i = 0; i < columnLengths.length; i++) {
				const l = columnLengths[i];
				rowSplitter += `${Utils.repeatString(HORIZONTAL_SYMBOL, l)}` + JOIN_SYMBOL;
			}
			rowSplitter += '\n';

			// Start build
			builder += rowSplitter;

			const rows = [this.columns, ...this.rows];
			for (let y = 0; y < rows.length; y++) {
				const row = rows[y];
				builder += VERTICAL_SYMBOL;

				for (let x = 0; x < this.columns.length; x++) {
					if (x >= row.length) {
						builder += Utils.repeatString(' ', columnLengths[x]) + VERTICAL_SYMBOL;
						continue;
					}
					let line = padding + row[x] + padding;
					const padLen = Math.max(((columnLengths[x] ?? 0) - line.length), 0) / 2;
					line = Utils.repeatString(' ', Math.ceil(padLen)) + line + Utils.repeatString(' ', Math.floor(padLen)) + VERTICAL_SYMBOL;

					builder += line;
				}

				builder += '\n' + rowSplitter;
			}

			return builder;
		}

		public clear(type?: 'rows' | 'columns') {
			if (!type || type == 'rows') this.rows = [];
			if (!type || type == 'columns') this.columns	= [];

			return this;
		}
	}

	export namespace BotUtils {
		export function isValidMember(member: any): member is GuildMember {
			return member instanceof GuildMember;
		}

		export function isPlaylistItem(item: QueuedItem): item is QueuedPlaylist {
			return item && 'videoList' in item;
		}

		export function isVideoItem(item: QueuedItem): item is QueuedVideo {
			return item && 'videoDetails' in item;
		}
	}
}

export type Vector2<K = number> = [K, K];
export type Vector3<K = number> = [K, K, K];
export type Vector4<K = number> = [K, K, K, K];

export default Utils;