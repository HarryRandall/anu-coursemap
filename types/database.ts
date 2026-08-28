export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      academic_periods: {
        Row: {
          calendar_year: number
          code: string
          created_at: string
          ends_on: string
          id: number
          name: string
          short_name: string
          sort_order: number
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          calendar_year: number
          code: string
          created_at?: string
          ends_on: string
          id?: never
          name: string
          short_name: string
          sort_order: number
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_year?: number
          code?: string
          created_at?: string
          ends_on?: string
          id?: never
          name?: string
          short_name?: string
          sort_order?: number
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      academic_structure_relationships: {
        Row: {
          catalogue_year_id: number
          child_structure_version_id: number
          created_at: string
          id: number
          parent_structure_version_id: number
          position: number
          relationship_kind: string
          source_document_id: number
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          child_structure_version_id: number
          created_at?: string
          id?: never
          parent_structure_version_id: number
          position?: number
          relationship_kind: string
          source_document_id: number
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          child_structure_version_id?: number
          created_at?: string
          id?: never
          parent_structure_version_id?: number
          position?: number
          relationship_kind?: string
          source_document_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_structure_relationships_child_year_fkey"
            columns: ["child_structure_version_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "academic_structure_versions"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "academic_structure_relationships_parent_year_fkey"
            columns: ["parent_structure_version_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "academic_structure_versions"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "academic_structure_relationships_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      academic_structure_versions: {
        Row: {
          catalogue_year_id: number
          college: string | null
          created_at: string
          description: string
          duration_years: number | null
          id: number
          name: string
          publication_status: string
          review_state: string
          source_document_id: number
          structure_id: number
          units: number
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          college?: string | null
          created_at?: string
          description: string
          duration_years?: number | null
          id?: never
          name: string
          publication_status?: string
          review_state?: string
          source_document_id: number
          structure_id: number
          units: number
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          college?: string | null
          created_at?: string
          description?: string
          duration_years?: number | null
          id?: never
          name?: string
          publication_status?: string
          review_state?: string
          source_document_id?: number
          structure_id?: number
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_structure_versions_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_structure_versions_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "academic_structure_versions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "academic_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_structures: {
        Row: {
          code: string
          created_at: string
          id: number
          kind: string
          public_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: never
          kind: string
          public_id?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: never
          kind?: string
          public_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_events: {
        Row: {
          actor_id: string | null
          approval_request_id: string
          details: Json
          event_kind: string
          id: number
          note: string | null
          occurred_at: string
          owner_id: string
        }
        Insert: {
          actor_id?: string | null
          approval_request_id: string
          details?: Json
          event_kind: string
          id?: never
          note?: string | null
          occurred_at?: string
          owner_id: string
        }
        Update: {
          actor_id?: string | null
          approval_request_id?: string
          details?: Json
          event_kind?: string
          id?: never
          note?: string | null
          occurred_at?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_request_owner_fkey"
            columns: ["approval_request_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          academic_period_id: number | null
          decision_note: string | null
          id: string
          owner_id: string
          plan_item_id: string | null
          reason: string
          request_kind: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          academic_period_id?: number | null
          decision_note?: string | null
          id?: string
          owner_id: string
          plan_item_id?: string | null
          reason: string
          request_kind: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          academic_period_id?: number | null
          decision_note?: string | null
          id?: string
          owner_id?: string
          plan_item_id?: string | null
          reason?: string
          request_kind?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_academic_period_id_fkey"
            columns: ["academic_period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_plan_item_owner_fkey"
            columns: ["plan_item_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      campus_map_campuses: {
        Row: {
          boundary_geojson: Json
          created_at: string
          east: number
          id: string
          initial_latitude: number
          initial_longitude: number
          initial_zoom: number
          max_zoom: number
          min_zoom: number
          name: string
          north: number
          slug: string
          sort_order: number
          source_identifier: string
          source_license: string
          source_url: string
          south: number
          status: string
          updated_at: string
          west: number
        }
        Insert: {
          boundary_geojson: Json
          created_at?: string
          east: number
          id?: string
          initial_latitude: number
          initial_longitude: number
          initial_zoom?: number
          max_zoom?: number
          min_zoom?: number
          name: string
          north: number
          slug: string
          sort_order?: number
          source_identifier: string
          source_license: string
          source_url: string
          south: number
          status?: string
          updated_at?: string
          west: number
        }
        Update: {
          boundary_geojson?: Json
          created_at?: string
          east?: number
          id?: string
          initial_latitude?: number
          initial_longitude?: number
          initial_zoom?: number
          max_zoom?: number
          min_zoom?: number
          name?: string
          north?: number
          slug?: string
          sort_order?: number
          source_identifier?: string
          source_license?: string
          source_url?: string
          south?: number
          status?: string
          updated_at?: string
          west?: number
        }
        Relationships: []
      }
      campus_map_features: {
        Row: {
          campus_id: string
          created_at: string
          feature_kind: string
          geometry_geojson: Json
          height_metres: number
          id: string
          layer_id: string
          minimum_height_metres: number
          name: string
          place_id: string | null
          slug: string
          sort_order: number
          source_identifier: string
          source_license: string
          source_properties: Json
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          feature_kind: string
          geometry_geojson: Json
          height_metres?: number
          id?: string
          layer_id: string
          minimum_height_metres?: number
          name: string
          place_id?: string | null
          slug: string
          sort_order?: number
          source_identifier: string
          source_license: string
          source_properties?: Json
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          feature_kind?: string
          geometry_geojson?: Json
          height_metres?: number
          id?: string
          layer_id?: string
          minimum_height_metres?: number
          name?: string
          place_id?: string | null
          slug?: string
          sort_order?: number
          source_identifier?: string
          source_license?: string
          source_properties?: Json
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_map_features_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_map_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_map_features_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "campus_map_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_map_features_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "campus_map_places"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_map_layers: {
        Row: {
          campus_id: string
          colour: string
          created_at: string
          description: string | null
          id: string
          is_visible_by_default: boolean
          layer_kind: string
          name: string
          slug: string
          sort_order: number
          status: string
          style_layer_patterns: string[]
          updated_at: string
        }
        Insert: {
          campus_id: string
          colour?: string
          created_at?: string
          description?: string | null
          id?: string
          is_visible_by_default?: boolean
          layer_kind?: string
          name: string
          slug: string
          sort_order?: number
          status?: string
          style_layer_patterns?: string[]
          updated_at?: string
        }
        Update: {
          campus_id?: string
          colour?: string
          created_at?: string
          description?: string | null
          id?: string
          is_visible_by_default?: boolean
          layer_kind?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: string
          style_layer_patterns?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_map_layers_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_map_campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_map_place_details: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          place_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          place_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          place_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_map_place_details_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "campus_map_places"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_map_places: {
        Row: {
          address: string
          created_at: string
          data_status: string
          id: string
          is_routable: boolean
          latitude: number
          layer_id: string
          longitude: number
          map_display_kind: string
          marker_label: string
          name: string
          official_url: string | null
          search_terms: string[]
          slug: string
          sort_order: number
          source_identifier: string | null
          source_license: string | null
          source_provider: string | null
          source_updated_at: string | null
          source_url: string | null
          source_version: number | null
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          data_status?: string
          id?: string
          is_routable?: boolean
          latitude: number
          layer_id: string
          longitude: number
          map_display_kind?: string
          marker_label: string
          name: string
          official_url?: string | null
          search_terms?: string[]
          slug: string
          sort_order?: number
          source_identifier?: string | null
          source_license?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          source_version?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          data_status?: string
          id?: string
          is_routable?: boolean
          latitude?: number
          layer_id?: string
          longitude?: number
          map_display_kind?: string
          marker_label?: string
          name?: string
          official_url?: string | null
          search_terms?: string[]
          slug?: string
          sort_order?: number
          source_identifier?: string | null
          source_license?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          source_version?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_map_places_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "campus_map_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_directory_courses: {
        Row: {
          career: string | null
          catalogue_year_id: number
          code: string
          created_at: string
          id: number
          import_run_id: string
          mode_of_delivery: string | null
          session: string | null
          source_document_id: number
          title: string
          units: number | null
          updated_at: string
        }
        Insert: {
          career?: string | null
          catalogue_year_id: number
          code: string
          created_at?: string
          id?: never
          import_run_id: string
          mode_of_delivery?: string | null
          session?: string | null
          source_document_id: number
          title: string
          units?: number | null
          updated_at?: string
        }
        Update: {
          career?: string | null
          catalogue_year_id?: number
          code?: string
          created_at?: string
          id?: never
          import_run_id?: string
          mode_of_delivery?: string | null
          session?: string | null
          source_document_id?: number
          title?: string
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_directory_courses_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_directory_courses_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "catalogue_import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_directory_courses_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      catalogue_directory_programmes: {
        Row: {
          career: string | null
          catalogue_year_id: number
          code: string
          created_at: string
          duration: number | null
          id: number
          import_run_id: string
          kind: string
          source_document_id: number
          title: string
          updated_at: string
        }
        Insert: {
          career?: string | null
          catalogue_year_id: number
          code: string
          created_at?: string
          duration?: number | null
          id?: never
          import_run_id: string
          kind: string
          source_document_id: number
          title: string
          updated_at?: string
        }
        Update: {
          career?: string | null
          catalogue_year_id?: number
          code?: string
          created_at?: string
          duration?: number | null
          id?: never
          import_run_id?: string
          kind?: string
          source_document_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_directory_programmes_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_directory_programmes_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "catalogue_import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_directory_programmes_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      catalogue_import_diagnostics: {
        Row: {
          created_at: string
          details: Json
          field: string | null
          id: number
          import_item_id: number
          issue_code: string
          severity: string
          source_fingerprint: string
          summary: string
        }
        Insert: {
          created_at?: string
          details?: Json
          field?: string | null
          id?: never
          import_item_id: number
          issue_code: string
          severity?: string
          source_fingerprint?: string
          summary: string
        }
        Update: {
          created_at?: string
          details?: Json
          field?: string | null
          id?: never
          import_item_id?: number
          issue_code?: string
          severity?: string
          source_fingerprint?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_import_diagnostics_import_item_id_fkey"
            columns: ["import_item_id"]
            isOneToOne: false
            referencedRelation: "catalogue_import_items"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_import_items: {
        Row: {
          catalogue_year_id: number
          created_at: string
          diagnostics: Json
          id: number
          outcome: string
          run_id: string
          source_document_id: number
          source_id: number
          target_key: string | null
          target_kind: string | null
        }
        Insert: {
          catalogue_year_id: number
          created_at?: string
          diagnostics?: Json
          id?: never
          outcome: string
          run_id: string
          source_document_id: number
          source_id: number
          target_key?: string | null
          target_kind?: string | null
        }
        Update: {
          catalogue_year_id?: number
          created_at?: string
          diagnostics?: Json
          id?: never
          outcome?: string
          run_id?: string
          source_document_id?: number
          source_id?: number
          target_key?: string | null
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_import_items_document_provenance_fkey"
            columns: ["source_document_id", "source_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "source_id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "catalogue_import_items_run_provenance_fkey"
            columns: ["run_id", "source_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_import_runs"
            referencedColumns: ["id", "source_id", "catalogue_year_id"]
          },
        ]
      }
      catalogue_import_runs: {
        Row: {
          added_count: number
          catalogue_year_id: number
          changed_count: number
          checked_count: number
          completed_at: string | null
          error_summary: string | null
          failed_count: number
          id: string
          initiated_by: string | null
          parser_version: string
          scope: string
          source_id: number
          started_at: string
          status: string
          trigger_kind: string
          unchanged_count: number
        }
        Insert: {
          added_count?: number
          catalogue_year_id: number
          changed_count?: number
          checked_count?: number
          completed_at?: string | null
          error_summary?: string | null
          failed_count?: number
          id?: string
          initiated_by?: string | null
          parser_version: string
          scope: string
          source_id: number
          started_at?: string
          status?: string
          trigger_kind: string
          unchanged_count?: number
        }
        Update: {
          added_count?: number
          catalogue_year_id?: number
          changed_count?: number
          checked_count?: number
          completed_at?: string | null
          error_summary?: string | null
          failed_count?: number
          id?: string
          initiated_by?: string | null
          parser_version?: string
          scope?: string
          source_id?: number
          started_at?: string
          status?: string
          trigger_kind?: string
          unchanged_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_import_runs_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_import_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "catalogue_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_review_items: {
        Row: {
          assigned_to: string | null
          catalogue_year_id: number
          created_at: string
          details: Json
          field: string
          id: number
          import_item_id: number
          issue_code: string
          new_value: Json | null
          old_value: Json | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          summary: string
          target_key: string
          target_kind: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          catalogue_year_id: number
          created_at?: string
          details?: Json
          field: string
          id?: never
          import_item_id: number
          issue_code: string
          new_value?: Json | null
          old_value?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          summary: string
          target_key: string
          target_kind: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          catalogue_year_id?: number
          created_at?: string
          details?: Json
          field?: string
          id?: never
          import_item_id?: number
          issue_code?: string
          new_value?: Json | null
          old_value?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          summary?: string
          target_key?: string
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_review_items_item_provenance_fkey"
            columns: ["import_item_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_import_items"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      catalogue_source_documents: {
        Row: {
          canonical_url: string
          catalogue_year_id: number
          content_sha256: string
          entity_kind: string
          external_key: string
          fetched_at: string
          http_etag: string | null
          id: number
          source_id: number
          source_last_modified: string | null
          storage_path: string | null
        }
        Insert: {
          canonical_url: string
          catalogue_year_id: number
          content_sha256: string
          entity_kind: string
          external_key: string
          fetched_at?: string
          http_etag?: string | null
          id?: never
          source_id: number
          source_last_modified?: string | null
          storage_path?: string | null
        }
        Update: {
          canonical_url?: string
          catalogue_year_id?: number
          content_sha256?: string
          entity_kind?: string
          external_key?: string
          fetched_at?: string
          http_etag?: string | null
          id?: never
          source_id?: number
          source_last_modified?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_source_documents_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_source_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "catalogue_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_sources: {
        Row: {
          base_url: string
          created_at: string
          id: number
          is_active: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: never
          is_active?: boolean
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: never
          is_active?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalogue_years: {
        Row: {
          created_at: string
          id: number
          published_at: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: never
          published_at?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: never
          published_at?: string | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      course_assessment_items: {
        Row: {
          course_version_id: number
          created_at: string
          id: number
          learning_outcomes: number[] | null
          position: number
          source_text: string
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          course_version_id: number
          created_at?: string
          id?: never
          learning_outcomes?: number[] | null
          position: number
          source_text: string
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          course_version_id?: number
          created_at?: string
          id?: never
          learning_outcomes?: number[] | null
          position?: number
          source_text?: string
          title?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_assessment_items_course_version_id_fkey"
            columns: ["course_version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_attempts: {
        Row: {
          academic_period_id: number
          course_id: number
          created_at: string
          grade: string | null
          id: string
          mark: number | null
          owner_id: string
          source: string
          status: string
          units_attempted: number
          units_earned: number
          updated_at: string
        }
        Insert: {
          academic_period_id: number
          course_id: number
          created_at?: string
          grade?: string | null
          id?: string
          mark?: number | null
          owner_id: string
          source?: string
          status: string
          units_attempted: number
          units_earned?: number
          updated_at?: string
        }
        Update: {
          academic_period_id?: number
          course_id?: number
          created_at?: string
          grade?: string | null
          id?: string
          mark?: number | null
          owner_id?: string
          source?: string
          status?: string
          units_attempted?: number
          units_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_attempts_academic_period_id_fkey"
            columns: ["academic_period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_learning_outcomes: {
        Row: {
          body: string
          course_version_id: number
          created_at: string
          id: number
          position: number
          updated_at: string
        }
        Insert: {
          body: string
          course_version_id: number
          created_at?: string
          id?: never
          position: number
          updated_at?: string
        }
        Update: {
          body?: string
          course_version_id?: number
          created_at?: string
          id?: never
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_learning_outcomes_course_version_id_fkey"
            columns: ["course_version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          catalogue_year_id: number
          course_version_id: number
          created_at: string
          delivery_mode: string | null
          id: number
          location: string | null
          source_document_id: number
          status: string
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          course_version_id: number
          created_at?: string
          delivery_mode?: string | null
          id?: never
          location?: string | null
          source_document_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          course_version_id?: number
          created_at?: string
          delivery_mode?: string | null
          id?: never
          location?: string | null
          source_document_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "course_offerings_version_year_fkey"
            columns: ["course_version_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      course_rule_conditions: {
        Row: {
          condition_kind: string
          confidence: number
          course_rule_id: number
          created_at: string
          free_text: string | null
          group_id: number
          id: number
          maximum_course_level: number | null
          minimum_course_level: number | null
          minimum_gpa: number | null
          minimum_mark: number | null
          minimum_units: number | null
          position: number
          required_course_id: number | null
          required_structure_id: number | null
          review_state: string
          source_text: string | null
          subject_code: string | null
          updated_at: string
        }
        Insert: {
          condition_kind: string
          confidence?: number
          course_rule_id: number
          created_at?: string
          free_text?: string | null
          group_id: number
          id?: never
          maximum_course_level?: number | null
          minimum_course_level?: number | null
          minimum_gpa?: number | null
          minimum_mark?: number | null
          minimum_units?: number | null
          position?: number
          required_course_id?: number | null
          required_structure_id?: number | null
          review_state?: string
          source_text?: string | null
          subject_code?: string | null
          updated_at?: string
        }
        Update: {
          condition_kind?: string
          confidence?: number
          course_rule_id?: number
          created_at?: string
          free_text?: string | null
          group_id?: number
          id?: never
          maximum_course_level?: number | null
          minimum_course_level?: number | null
          minimum_gpa?: number | null
          minimum_mark?: number | null
          minimum_units?: number | null
          position?: number
          required_course_id?: number | null
          required_structure_id?: number | null
          review_state?: string
          source_text?: string | null
          subject_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_rule_conditions_group_rule_fkey"
            columns: ["group_id", "course_rule_id"]
            isOneToOne: false
            referencedRelation: "course_rule_groups"
            referencedColumns: ["id", "course_rule_id"]
          },
          {
            foreignKeyName: "course_rule_conditions_required_course_id_fkey"
            columns: ["required_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_rule_conditions_required_structure_id_fkey"
            columns: ["required_structure_id"]
            isOneToOne: false
            referencedRelation: "academic_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      course_rule_course_references: {
        Row: {
          confidence: number
          course_rule_id: number
          created_at: string
          id: number
          referenced_course_id: number
          review_state: string
          source_text: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          course_rule_id: number
          created_at?: string
          id?: never
          referenced_course_id: number
          review_state?: string
          source_text: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          course_rule_id?: number
          created_at?: string
          id?: never
          referenced_course_id?: number
          review_state?: string
          source_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_rule_course_references_course_fkey"
            columns: ["referenced_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_rule_course_references_rule_fkey"
            columns: ["course_rule_id"]
            isOneToOne: false
            referencedRelation: "course_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_rule_groups: {
        Row: {
          course_rule_id: number
          created_at: string
          id: number
          minimum_count: number | null
          operator: string
          parent_group_id: number | null
          position: number
          updated_at: string
        }
        Insert: {
          course_rule_id: number
          created_at?: string
          id?: never
          minimum_count?: number | null
          operator: string
          parent_group_id?: number | null
          position?: number
          updated_at?: string
        }
        Update: {
          course_rule_id?: number
          created_at?: string
          id?: never
          minimum_count?: number | null
          operator?: string
          parent_group_id?: number | null
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_rule_groups_course_rule_id_fkey"
            columns: ["course_rule_id"]
            isOneToOne: false
            referencedRelation: "course_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_rule_groups_parent_rule_fkey"
            columns: ["parent_group_id", "course_rule_id"]
            isOneToOne: false
            referencedRelation: "course_rule_groups"
            referencedColumns: ["id", "course_rule_id"]
          },
        ]
      }
      course_rules: {
        Row: {
          catalogue_year_id: number
          confidence: number
          course_version_id: number
          created_at: string
          hardness: string
          id: number
          review_state: string
          rule_kind: string
          source_document_id: number
          source_text: string
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          confidence?: number
          course_version_id: number
          created_at?: string
          hardness?: string
          id?: never
          review_state?: string
          rule_kind: string
          source_document_id: number
          source_text: string
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          confidence?: number
          course_version_id?: number
          created_at?: string
          hardness?: string
          id?: never
          review_state?: string
          rule_kind?: string
          source_document_id?: number
          source_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_rules_course_version_year_fkey"
            columns: ["course_version_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "course_rules_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      course_versions: {
        Row: {
          catalogue_year_id: number
          convener: string | null
          course_id: number
          created_at: string
          delivery_summary: string | null
          description: string
          eftsl: number | null
          fee_domestic: number | null
          fee_international: number | null
          fee_year: number | null
          id: number
          inherent_requirements: string | null
          level: number
          prescribed_texts: string | null
          publication_status: string
          review_state: string
          school: string
          source_document_id: number
          source_updated_at: string | null
          student_contribution_band: number | null
          subject: string
          title: string
          units: number
          updated_at: string
          workload: string | null
          workload_hours: number | null
        }
        Insert: {
          catalogue_year_id: number
          convener?: string | null
          course_id: number
          created_at?: string
          delivery_summary?: string | null
          description: string
          eftsl?: number | null
          fee_domestic?: number | null
          fee_international?: number | null
          fee_year?: number | null
          id?: never
          inherent_requirements?: string | null
          level: number
          prescribed_texts?: string | null
          publication_status?: string
          review_state?: string
          school: string
          source_document_id: number
          source_updated_at?: string | null
          student_contribution_band?: number | null
          subject: string
          title: string
          units: number
          updated_at?: string
          workload?: string | null
          workload_hours?: number | null
        }
        Update: {
          catalogue_year_id?: number
          convener?: string | null
          course_id?: number
          created_at?: string
          delivery_summary?: string | null
          description?: string
          eftsl?: number | null
          fee_domestic?: number | null
          fee_international?: number | null
          fee_year?: number | null
          id?: never
          inherent_requirements?: string | null
          level?: number
          prescribed_texts?: string | null
          publication_status?: string
          review_state?: string
          school?: string
          source_document_id?: number
          source_updated_at?: string | null
          student_contribution_band?: number | null
          subject?: string
          title?: string
          units?: number
          updated_at?: string
          workload?: string | null
          workload_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_versions_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_versions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_versions_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          id: number
          public_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: never
          public_id?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: never
          public_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      offering_sessions: {
        Row: {
          academic_period_id: number
          catalogue_year_id: number
          census_on: string | null
          class_number: string | null
          class_summary_url: string | null
          course_offering_id: number
          created_at: string
          delivery_mode: string | null
          ends_on: string | null
          enrol_closes_on: string | null
          id: number
          location: string | null
          source_document_id: number
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          academic_period_id: number
          catalogue_year_id: number
          census_on?: string | null
          class_number?: string | null
          class_summary_url?: string | null
          course_offering_id: number
          created_at?: string
          delivery_mode?: string | null
          ends_on?: string | null
          enrol_closes_on?: string | null
          id?: never
          location?: string | null
          source_document_id: number
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          academic_period_id?: number
          catalogue_year_id?: number
          census_on?: string | null
          class_number?: string | null
          class_summary_url?: string | null
          course_offering_id?: number
          created_at?: string
          delivery_mode?: string | null
          ends_on?: string | null
          enrol_closes_on?: string | null
          id?: never
          location?: string | null
          source_document_id?: number
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offering_sessions_academic_period_id_fkey"
            columns: ["academic_period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_sessions_offering_year_fkey"
            columns: ["course_offering_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "offering_sessions_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      plan_items: {
        Row: {
          academic_period_id: number | null
          course_id: number
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          plan_id: string
          planned_calendar_year: number | null
          planned_period_code: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          academic_period_id?: number | null
          course_id: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          plan_id: string
          planned_calendar_year?: number | null
          planned_period_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          academic_period_id?: number | null
          course_id?: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          plan_id?: string
          planned_calendar_year?: number | null
          planned_period_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_academic_period_id_fkey"
            columns: ["academic_period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_owner_fkey"
            columns: ["plan_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      plan_structures: {
        Row: {
          catalogue_year_id: number
          created_at: string
          id: string
          owner_id: string
          plan_id: string
          position: number
          role: string
          structure_version_id: number
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          created_at?: string
          id?: string
          owner_id: string
          plan_id: string
          position?: number
          role: string
          structure_version_id: number
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          created_at?: string
          id?: string
          owner_id?: string
          plan_id?: string
          position?: number
          role?: string
          structure_version_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_structures_plan_owner_year_fkey"
            columns: ["plan_id", "owner_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id", "owner_id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "plan_structures_structure_year_fkey"
            columns: ["structure_version_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "academic_structure_versions"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      plans: {
        Row: {
          catalogue_year_id: number
          commencement_year: number
          created_at: string
          extension_years: number
          id: string
          is_primary: boolean
          name: string
          owner_id: string
          status: string
          study_load: string
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          commencement_year: number
          created_at?: string
          extension_years?: number
          id?: string
          is_primary?: boolean
          name: string
          owner_id: string
          status?: string
          study_load: string
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          commencement_year?: number
          created_at?: string
          extension_years?: number
          id?: string
          is_primary?: boolean
          name?: string
          owner_id?: string
          status?: string
          study_load?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_catalogue_year_id_fkey"
            columns: ["catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_years"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          student_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email?: string | null
          id: string
          student_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          student_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      requirement_conditions: {
        Row: {
          code: string
          condition_kind: string
          course_id: number | null
          created_at: string
          id: number
          maximum_course_level: number | null
          minimum_course_level: number | null
          minimum_units: number | null
          position: number
          requirement_group_id: number
          source_text: string | null
          structure_version_id: number
          subject_code: string | null
          target_structure_id: number | null
          updated_at: string
        }
        Insert: {
          code: string
          condition_kind: string
          course_id?: number | null
          created_at?: string
          id?: never
          maximum_course_level?: number | null
          minimum_course_level?: number | null
          minimum_units?: number | null
          position?: number
          requirement_group_id: number
          source_text?: string | null
          structure_version_id: number
          subject_code?: string | null
          target_structure_id?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          condition_kind?: string
          course_id?: number | null
          created_at?: string
          id?: never
          maximum_course_level?: number | null
          minimum_course_level?: number | null
          minimum_units?: number | null
          position?: number
          requirement_group_id?: number
          source_text?: string | null
          structure_version_id?: number
          subject_code?: string | null
          target_structure_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_conditions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_conditions_group_structure_fkey"
            columns: ["requirement_group_id", "structure_version_id"]
            isOneToOne: false
            referencedRelation: "requirement_groups"
            referencedColumns: ["id", "structure_version_id"]
          },
          {
            foreignKeyName: "requirement_conditions_target_structure_id_fkey"
            columns: ["target_structure_id"]
            isOneToOne: false
            referencedRelation: "academic_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_groups: {
        Row: {
          catalogue_year_id: number
          code: string
          created_at: string
          description: string | null
          id: number
          minimum_count: number | null
          minimum_units: number | null
          name: string
          operator: string
          parent_group_id: number | null
          position: number
          source_document_id: number
          source_text: string
          structure_version_id: number
          updated_at: string
        }
        Insert: {
          catalogue_year_id: number
          code: string
          created_at?: string
          description?: string | null
          id?: never
          minimum_count?: number | null
          minimum_units?: number | null
          name: string
          operator: string
          parent_group_id?: number | null
          position?: number
          source_document_id: number
          source_text: string
          structure_version_id: number
          updated_at?: string
        }
        Update: {
          catalogue_year_id?: number
          code?: string
          created_at?: string
          description?: string | null
          id?: never
          minimum_count?: number | null
          minimum_units?: number | null
          name?: string
          operator?: string
          parent_group_id?: number | null
          position?: number
          source_document_id?: number
          source_text?: string
          structure_version_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_groups_parent_structure_fkey"
            columns: ["parent_group_id", "structure_version_id"]
            isOneToOne: false
            referencedRelation: "requirement_groups"
            referencedColumns: ["id", "structure_version_id"]
          },
          {
            foreignKeyName: "requirement_groups_source_document_year_fkey"
            columns: ["source_document_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id", "catalogue_year_id"]
          },
          {
            foreignKeyName: "requirement_groups_structure_version_year_fkey"
            columns: ["structure_version_id", "catalogue_year_id"]
            isOneToOne: false
            referencedRelation: "academic_structure_versions"
            referencedColumns: ["id", "catalogue_year_id"]
          },
        ]
      }
      university_calendar_events: {
        Row: {
          calendar_year: number
          created_at: string
          event_date: string
          id: number
          source_document_id: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          calendar_year: number
          created_at?: string
          event_date: string
          id?: never
          source_document_id?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          calendar_year?: number
          created_at?: string
          event_date?: string
          id?: never
          source_document_id?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_calendar_events_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "catalogue_source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_permissions: {
        Row: {
          permission_category: string | null
          permission_description: string | null
          permission_id: number | null
          permission_key: string | null
          permission_name: string | null
        }
        Insert: {
          permission_category?: string | null
          permission_description?: string | null
          permission_id?: number | null
          permission_key?: string | null
          permission_name?: string | null
        }
        Update: {
          permission_category?: string | null
          permission_description?: string | null
          permission_id?: number | null
          permission_key?: string | null
          permission_name?: string | null
        }
        Relationships: []
      }
      admin_role_permissions: {
        Row: {
          permission_id: number | null
          role_id: number | null
        }
        Insert: {
          permission_id?: number | null
          role_id?: number | null
        }
        Update: {
          permission_id?: number | null
          role_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["permission_id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          permission_keys: string[] | null
          role_description: string | null
          role_id: number | null
          role_key: string | null
          role_name: string | null
        }
        Relationships: []
      }
      admin_user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          role_key: string | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          student_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          student_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          student_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_current_user_plan_item: {
        Args: {
          p_course_code: string
          p_planned_calendar_year?: number
          p_planned_period_code?: string
        }
        Returns: string
      }
      catalogue_change_issue_codes: { Args: never; Returns: string[] }
      current_user_has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      move_current_user_plan_item: {
        Args: {
          p_before_plan_item_id?: string
          p_plan_item_id: string
          p_planned_calendar_year?: number
          p_planned_period_code?: string
        }
        Returns: undefined
      }
      publish_catalogue_course_version: {
        Args: { p_catalogue_year: number; p_course_code: string }
        Returns: number
      }
      publish_catalogue_structure_version: {
        Args: { p_catalogue_year: number; p_structure_code: string }
        Returns: number
      }
      published_course_detail: {
        Args: { p_course_code: string }
        Returns: Json
      }
      published_course_requisite_graph: {
        Args: { p_course_code: string }
        Returns: {
          from_code: string
          from_is_available: boolean
          to_code: string
          to_is_available: boolean
        }[]
      }
      record_current_user_course_attempt: {
        Args: {
          p_attempt_mark?: number
          p_attempt_status: string
          p_plan_item_id: string
        }
        Returns: string
      }
      remove_current_user_plan_item: {
        Args: { p_plan_item_id: string }
        Returns: boolean
      }
      save_current_user_primary_plan: {
        Args: {
          p_catalogue_year: number
          p_commencement_year: number
          p_display_name: string
          p_major_code?: string
          p_programme_code: string
          p_student_number: string
          p_study_load: string
        }
        Returns: string
      }
      set_current_user_plan_extension_years: {
        Args: { p_extension_years: number }
        Returns: undefined
      }
      set_role_permission: {
        Args: { p_enabled: boolean; p_permission_id: number; p_role_id: number }
        Returns: boolean
      }
      set_user_role: {
        Args: { p_role_key: string; p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

