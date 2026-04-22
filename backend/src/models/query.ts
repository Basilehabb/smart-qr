type SortDirection = 1 | -1;

const toComparable = (value: any) => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const date = Date.parse(value);
    return Number.isNaN(date) ? value.toLowerCase() : date;
  }
  return value ?? "";
};

const applySelect = (value: any, selectValue?: string) => {
  if (!value || !selectValue) return value;
  const out = { ...value };
  const fields = selectValue.split(/\s+/).filter(Boolean);

  for (const field of fields) {
    if (field.startsWith("-")) {
      delete out[field.slice(1)];
    }
  }

  return out;
};

export class QueryOne<T extends { toObject?: () => any }> implements PromiseLike<any> {
  private selectValue?: string;
  private populateField?: string;
  private populateSelect?: string;

  constructor(
    private readonly loader: () => Promise<T | null>,
    private readonly populateLoader?: (doc: T, field: string, select?: string) => Promise<T>
  ) {}

  select(value: string) {
    this.selectValue = value;
    return this;
  }

  populate(field: string, select?: string) {
    this.populateField = field;
    this.populateSelect = select;
    return this;
  }

  lean() {
    return this.then((doc: any) => (doc?.toObject ? doc.toObject() : doc));
  }

  async exec() {
    let doc = await this.loader();
    if (doc && this.populateField && this.populateLoader) {
      doc = await this.populateLoader(doc, this.populateField, this.populateSelect);
    }

    if (doc?.toObject) {
      const selected = applySelect(doc.toObject(), this.selectValue);
      Object.assign(doc as any, selected);
      for (const key of Object.keys(doc as any)) {
        if (!(key in selected) && this.selectValue?.includes(`-${key}`)) {
          delete (doc as any)[key];
        }
      }
    }

    return doc;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export class QueryMany<T extends { toObject?: () => any }> implements PromiseLike<any[]> {
  private selectValue?: string;
  private sortValue?: Record<string, SortDirection>;
  private skipValue = 0;
  private limitValue?: number;
  private leanValue = false;
  private populateField?: string;
  private populateSelect?: string;

  constructor(
    private readonly loader: () => Promise<T[]>,
    private readonly populateLoader?: (doc: T, field: string, select?: string) => Promise<T>
  ) {}

  select(value: string) {
    this.selectValue = value;
    return this;
  }

  sort(value: Record<string, SortDirection>) {
    this.sortValue = value;
    return this;
  }

  skip(value: number) {
    this.skipValue = value;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  lean() {
    this.leanValue = true;
    return this;
  }

  populate(field: string, select?: string) {
    this.populateField = field;
    this.populateSelect = select;
    return this;
  }

  async exec() {
    let docs = await this.loader();

    if (this.populateField && this.populateLoader) {
      docs = await Promise.all(
        docs.map((doc) => this.populateLoader!(doc, this.populateField!, this.populateSelect))
      );
    }

    if (this.sortValue) {
      const [[field, direction]] = Object.entries(this.sortValue);
      docs = [...docs].sort((a: any, b: any) => {
        const av = toComparable(a[field]);
        const bv = toComparable(b[field]);
        if (av < bv) return direction === 1 ? -1 : 1;
        if (av > bv) return direction === 1 ? 1 : -1;
        return 0;
      });
    }

    if (this.skipValue) docs = docs.slice(this.skipValue);
    if (this.limitValue !== undefined) docs = docs.slice(0, this.limitValue);

    return docs.map((doc: any) => {
      const obj = doc?.toObject ? doc.toObject() : doc;
      const selected = applySelect(obj, this.selectValue);
      return this.leanValue ? selected : Object.assign(doc, selected);
    });
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}
