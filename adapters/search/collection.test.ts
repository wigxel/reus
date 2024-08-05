import { format, parse } from "./collection";

it("should parse collection filter from OBJECT", () => {
  const value = parse({
    name: { in: ["James", "Frank"], eq: "James", neq: "value", like: "Joseph" }, // eq
    method: { in: ["payment"], not: ["sammy"] }, // in array
    fickle: { neq: "Joan" },
  });

  expect(value).toMatchObject([
    {
      filters: [
        {
          field: "name",
          kind: "FILTER",
          operation: "in",
          value: ["James", "Frank"],
        },
        {
          field: "name",
          kind: "FILTER",
          operation: "eq",
          value: "James",
        },
        {
          field: "name",
          kind: "FILTER",
          operation: "neq",
          value: "value",
        },
        {
          field: "name",
          kind: "FILTER",
          operation: "like",
          value: "%Joseph%",
        },
      ],
      kind: "LOGIC",
      logic: "AND",
    },
    {
      filters: [
        {
          field: "method",
          kind: "FILTER",
          operation: "in",
          value: ["payment"],
        },
        {
          field: "method",
          kind: "FILTER",
          operation: "not",
          value: ["sammy"],
        },
      ],
      kind: "LOGIC",
      logic: "AND",
    },
    {
      filters: [
        {
          field: "fickle",
          kind: "FILTER",
          operation: "neq",
          value: "Joan",
        },
      ],
      kind: "LOGIC",
      logic: "AND",
    },
  ]);
});

it("should parse collection filter from OR", () => {
  const value = parse({
    $or: {
      firstname: {
        ilike: "james",
      },
      lastname: {
        ilike: "james",
      },
    },
    $and: {
      firstname: {
        eq: "james",
      },
    },
  });

  expect(value).toMatchInlineSnapshot(`
    [
      {
        "filters": [
          {
            "filters": [
              {
                "field": "firstname",
                "kind": "FILTER",
                "operation": "ilike",
                "value": "%james%",
              },
            ],
            "kind": "LOGIC",
            "logic": "AND",
          },
          {
            "filters": [
              {
                "field": "lastname",
                "kind": "FILTER",
                "operation": "ilike",
                "value": "%james%",
              },
            ],
            "kind": "LOGIC",
            "logic": "AND",
          },
        ],
        "kind": "LOGIC",
        "logic": "OR",
      },
      {
        "filters": [
          {
            "filters": [
              {
                "field": "firstname",
                "kind": "FILTER",
                "operation": "eq",
                "value": "james",
              },
            ],
            "kind": "LOGIC",
            "logic": "AND",
          },
        ],
        "kind": "LOGIC",
        "logic": "AND",
      },
    ]
  `);
});

it("should simplify collection filter", () => {
  const filters = parse({
    name: {
      in: ["James", "Frank"],
      eq: "James",
      neq: "value",
      like: "Joseph",
    },
    payment_method: { in: ["online"], not: ["cash"] },
  });

  const output = format(filters);
  expect(output).toMatchInlineSnapshot(`
    {
      "name": {
        "eq": "James",
        "in": [
          "James",
          "Frank",
        ],
        "like": "%Joseph%",
        "neq": "value",
      },
      "payment_method": {
        "in": [
          "online",
        ],
        "not": [
          "cash",
        ],
      },
    }
  `);
});

it("should return an empty array for invalid data types", () => {
  expect(parse(undefined)).toMatchObject([]);
  expect(parse(null)).toMatchObject([]);
  expect(parse([])).toMatchObject([]);
  expect(parse(true)).toMatchObject([]);
  expect(parse(false)).toMatchObject([]);
  expect(parse(new Set())).toMatchObject([]);
  expect(parse(new Map())).toMatchObject([]);
});
