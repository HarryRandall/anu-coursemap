-- Indoor documents gain a wall primitive (version 2).
--
-- Walls are polylines with a thickness and openings cut through them. A door is
-- now an opening in a wall rather than a loose route node, so a route can only
-- cross a wall where a gap was actually drawn, and an opening leading outside
-- doubles as the building entrance the outdoor route needs.
--
-- The check accepts both versions while any version 1 row survives; the
-- application upgrades on read. A later migration tightens it to version 2.

alter table public.campus_indoor_maps
  drop constraint campus_indoor_maps_document_check;

alter table public.campus_indoor_maps
  add constraint campus_indoor_maps_document_check check (
    jsonb_typeof(document) = 'object'
    and document ->> 'version' in ('1', '2')
    and jsonb_typeof(document -> 'viewBox') = 'object'
    and jsonb_typeof(document -> 'levels') = 'array'
    and jsonb_typeof(document -> 'spaces') = 'array'
    and jsonb_typeof(document -> 'connectors') = 'array'
    and jsonb_typeof(document -> 'routeNodes') = 'array'
    and jsonb_typeof(document -> 'routeEdges') = 'array'
    and (
      document -> 'walls' is null
      or jsonb_typeof(document -> 'walls') = 'array'
    )
  );

comment on column public.campus_indoor_maps.document is
  'Coursemap indoor document (version 2): levels, walls with openings, spaces, connectors and an explicit route graph in local units at ten units per metre.';

-- The Copland Building is a seeded fixture, so it is rewritten in full rather
-- than migrated in place. Its ground perimeter carries an exterior entrance and
-- a door into room G01 so the seed demonstrates the primitive.
update public.campus_indoor_maps
set
  document = $document$
{
  "version": 2,
  "viewBox": {
    "width": 1000,
    "height": 700
  },
  "levels": [
    {
      "id": "71000000-0000-4000-8000-000000000001",
      "number": 0,
      "ref": "G",
      "name": "Ground floor",
      "elevationMetres": 0,
      "heightMetres": 3.6,
      "outline": [
        {
          "x": 70,
          "y": 90
        },
        {
          "x": 820,
          "y": 90
        },
        {
          "x": 930,
          "y": 210
        },
        {
          "x": 775,
          "y": 610
        },
        {
          "x": 80,
          "y": 610
        }
      ]
    },
    {
      "id": "71000000-0000-4000-8000-000000000002",
      "number": 1,
      "ref": "1",
      "name": "Level 1",
      "elevationMetres": 3.6,
      "heightMetres": 3.6,
      "outline": [
        {
          "x": 70,
          "y": 90
        },
        {
          "x": 820,
          "y": 90
        },
        {
          "x": 930,
          "y": 210
        },
        {
          "x": 775,
          "y": 610
        },
        {
          "x": 80,
          "y": 610
        }
      ]
    },
    {
      "id": "71000000-0000-4000-8000-000000000003",
      "number": 2,
      "ref": "2",
      "name": "Level 2",
      "elevationMetres": 7.2,
      "heightMetres": 3.6,
      "outline": [
        {
          "x": 70,
          "y": 90
        },
        {
          "x": 820,
          "y": 90
        },
        {
          "x": 930,
          "y": 210
        },
        {
          "x": 775,
          "y": 610
        },
        {
          "x": 80,
          "y": 610
        }
      ]
    }
  ],
  "walls": [
    {
      "id": "wall-outline-71000000-0000-4000-8000-000000000001",
      "levelId": "71000000-0000-4000-8000-000000000001",
      "kind": "structural",
      "points": [
        {
          "x": 70,
          "y": 90
        },
        {
          "x": 820,
          "y": 90
        },
        {
          "x": 930,
          "y": 210
        },
        {
          "x": 775,
          "y": 610
        },
        {
          "x": 80,
          "y": 610
        }
      ],
      "thickness": 2,
      "closed": true,
      "openings": [
        {
          "id": "74000000-0000-4000-8000-000000000001",
          "kind": "door",
          "segmentIndex": 3,
          "offset": 0.5,
          "width": 24,
          "accessibility": "accessible",
          "exterior": true
        }
      ]
    },
    {
      "id": "wall-outline-71000000-0000-4000-8000-000000000002",
      "levelId": "71000000-0000-4000-8000-000000000002",
      "kind": "structural",
      "points": [
        {
          "x": 70,
          "y": 90
        },
        {
          "x": 820,
          "y": 90
        },
        {
          "x": 930,
          "y": 210
        },
        {
          "x": 775,
          "y": 610
        },
        {
          "x": 80,
          "y": 610
        }
      ],
      "thickness": 2,
      "closed": true,
      "openings": []
    },
    {
      "id": "wall-outline-71000000-0000-4000-8000-000000000003",
      "levelId": "71000000-0000-4000-8000-000000000003",
      "kind": "structural",
      "points": [
        {
          "x": 70,
          "y": 90
        },
        {
          "x": 820,
          "y": 90
        },
        {
          "x": 930,
          "y": 210
        },
        {
          "x": 775,
          "y": 610
        },
        {
          "x": 80,
          "y": 610
        }
      ],
      "thickness": 2,
      "closed": true,
      "openings": []
    },
    {
      "id": "74000000-0000-4000-8000-000000000010",
      "levelId": "71000000-0000-4000-8000-000000000001",
      "kind": "partition",
      "points": [
        {
          "x": 120,
          "y": 310
        },
        {
          "x": 375,
          "y": 310
        }
      ],
      "thickness": 1.5,
      "closed": false,
      "openings": [
        {
          "id": "74000000-0000-4000-8000-000000000011",
          "kind": "door",
          "segmentIndex": 0,
          "offset": 0.5,
          "width": 18,
          "accessibility": "accessible",
          "spaceId": "72000000-0000-4000-8000-000000000001"
        }
      ]
    }
  ],
  "spaces": [
    {
      "id": "72000000-0000-4000-8000-000000000001",
      "levelId": "71000000-0000-4000-8000-000000000001",
      "kind": "room",
      "ref": "G01",
      "name": "Example room G01",
      "searchable": true,
      "geometry": {
        "type": "rectangle",
        "x": 120,
        "y": 145,
        "width": 255,
        "height": 165,
        "cornerRadius": 12
      }
    },
    {
      "id": "72000000-0000-4000-8000-000000000002",
      "levelId": "71000000-0000-4000-8000-000000000001",
      "kind": "room",
      "ref": "G02",
      "name": "Example round room G02",
      "searchable": true,
      "geometry": {
        "type": "ellipse",
        "cx": 655,
        "cy": 245,
        "rx": 125,
        "ry": 95
      }
    },
    {
      "id": "72000000-0000-4000-8000-000000000003",
      "levelId": "71000000-0000-4000-8000-000000000001",
      "kind": "corridor",
      "ref": "",
      "name": "Ground floor corridor",
      "searchable": false,
      "geometry": {
        "type": "polygon",
        "points": [
          {
            "x": 105,
            "y": 370
          },
          {
            "x": 825,
            "y": 370
          },
          {
            "x": 790,
            "y": 465
          },
          {
            "x": 105,
            "y": 465
          }
        ]
      }
    },
    {
      "id": "72000000-0000-4000-8000-000000000004",
      "levelId": "71000000-0000-4000-8000-000000000002",
      "kind": "room",
      "ref": "1.01",
      "name": "Example room 1.01",
      "searchable": true,
      "geometry": {
        "type": "rectangle",
        "x": 125,
        "y": 145,
        "width": 310,
        "height": 180,
        "cornerRadius": 10
      }
    },
    {
      "id": "72000000-0000-4000-8000-000000000005",
      "levelId": "71000000-0000-4000-8000-000000000003",
      "kind": "room",
      "ref": "2.01",
      "name": "Example room 2.01",
      "searchable": true,
      "geometry": {
        "type": "polygon",
        "points": [
          {
            "x": 130,
            "y": 145
          },
          {
            "x": 465,
            "y": 145
          },
          {
            "x": 520,
            "y": 255
          },
          {
            "x": 430,
            "y": 345
          },
          {
            "x": 130,
            "y": 310
          }
        ]
      }
    }
  ],
  "connectors": [
    {
      "id": "73000000-0000-4000-8000-000000000001",
      "kind": "stairs",
      "name": "Main stairs",
      "levelIds": [
        "71000000-0000-4000-8000-000000000001",
        "71000000-0000-4000-8000-000000000002",
        "71000000-0000-4000-8000-000000000003"
      ],
      "position": {
        "x": 535,
        "y": 420
      },
      "accessibility": "inaccessible"
    },
    {
      "id": "73000000-0000-4000-8000-000000000002",
      "kind": "lift",
      "name": "Main lift",
      "levelIds": [
        "71000000-0000-4000-8000-000000000001",
        "71000000-0000-4000-8000-000000000002",
        "71000000-0000-4000-8000-000000000003"
      ],
      "position": {
        "x": 655,
        "y": 420
      },
      "accessibility": "unknown"
    }
  ],
  "routeNodes": [],
  "routeEdges": []
}
$document$::jsonb,
  revision = revision + 1
where id = '70000000-0000-4000-8000-000000000001';
