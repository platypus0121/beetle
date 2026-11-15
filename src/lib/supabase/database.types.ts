
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "auction_secrets": {
                  Row: {
                    "listing_id": number,"reserve_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "listing_id": number,"reserve_price": number
                  }
                  Update: {
                    "listing_id"?: number,"reserve_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "auction_secrets_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: true
      referencedRelation: "auctions"
      referencedColumns: ["listing_id"]
    }
                  ]
                },"auctions": {
                  Row: {
                    "bid_count": number,"buy_now_price": number | null,"cancelled_reason": string | null,"created_at": string,"current_bidder_id": string | null,"current_price": number,"ends_at": string,"has_reserve": boolean,"listing_id": number,"min_increment": number,"reserve_met": boolean,"start_price": number,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bid_count"?: number,"buy_now_price"?: number | null,"cancelled_reason"?: string | null,"created_at"?: string,"current_bidder_id"?: string | null,"current_price": number,"ends_at": string,"has_reserve"?: boolean,"listing_id": number,"min_increment": number,"reserve_met"?: boolean,"start_price": number,"status"?: string
                  }
                  Update: {
                    "bid_count"?: number,"buy_now_price"?: number | null,"cancelled_reason"?: string | null,"created_at"?: string,"current_bidder_id"?: string | null,"current_price"?: number,"ends_at"?: string,"has_reserve"?: boolean,"listing_id"?: number,"min_increment"?: number,"reserve_met"?: boolean,"start_price"?: number,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auctions_current_bidder_id_fkey"
      columns: ["current_bidder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auctions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: true
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"auto_bids": {
                  Row: {
                    "bidder_id": string,"listing_id": number,"max_amount": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bidder_id": string,"listing_id": number,"max_amount": number,"updated_at"?: string
                  }
                  Update: {
                    "bidder_id"?: string,"listing_id"?: number,"max_amount"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auto_bids_bidder_id_fkey"
      columns: ["bidder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auto_bids_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "auctions"
      referencedColumns: ["listing_id"]
    }
                  ]
                },"banned_words": {
                  Row: {
                    "created_at": string,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"word": string
                  }
                  Update: {
                    "created_at"?: string,"word"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bids": {
                  Row: {
                    "amount": number,"bidder_id": string,"created_at": string,"id": number,"is_auto": boolean,"listing_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"bidder_id": string,"created_at"?: string,"id"?: never,"is_auto"?: boolean,"listing_id": number
                  }
                  Update: {
                    "amount"?: number,"bidder_id"?: string,"created_at"?: string,"id"?: never,"is_auto"?: boolean,"listing_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bids_bidder_id_fkey"
      columns: ["bidder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "auctions"
      referencedColumns: ["listing_id"]
    }
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bookmarks": {
                  Row: {
                    "created_at": string,"target_id": number,"target_type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"target_id": number,"target_type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"target_id"?: number,"target_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bottle_changes": {
                  Row: {
                    "changed_on": string,"id": number,"next_due_on": string | null,"note": string | null,"reminded": boolean,"specimen_id": number,"substrate": string | null,"volume_ml": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_on": string,"id"?: never,"next_due_on"?: string | null,"note"?: string | null,"reminded"?: boolean,"specimen_id": number,"substrate"?: string | null,"volume_ml"?: number | null
                  }
                  Update: {
                    "changed_on"?: string,"id"?: never,"next_due_on"?: string | null,"note"?: string | null,"reminded"?: boolean,"specimen_id"?: number,"substrate"?: string | null,"volume_ml"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bottle_changes_specimen_id_fkey"
      columns: ["specimen_id"]
isOneToOne: false
      referencedRelation: "specimens"
      referencedColumns: ["id"]
    }
                  ]
                },"comment_likes": {
                  Row: {
                    "comment_id": number,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id": number,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "comment_id"?: number,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comment_likes_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comment_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"edited_at": string | null,"id": number,"like_count": number,"parent_id": number | null,"post_id": number,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"edited_at"?: string | null,"id"?: never,"like_count"?: number,"parent_id"?: number | null,"post_id": number,"status"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: never,"like_count"?: number,"parent_id"?: number | null,"post_id"?: number,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"content_views": {
                  Row: {
                    "kind": string,"target_id": number,"views": number
                  }
                  ComputedFields: never
                  Insert: {
                    "kind": string,"target_id": number,"views"?: number
                  }
                  Update: {
                    "kind"?: string,"target_id"?: number,"views"?: number
                  }
                  Relationships: [
                    
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"id": number,"last_message_at": string,"last_message_preview": string | null,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"last_message_at"?: string,"last_message_preview"?: string | null,"user_a": string,"user_b": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"last_message_at"?: string,"last_message_preview"?: string | null,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_events": {
                  Row: {
                    "created_at": string,"delta": number,"id": number,"order_id": number | null,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: never,"order_id"?: number | null,"reason": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: never,"order_id"?: number | null,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credit_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"disputes": {
                  Row: {
                    "created_at": string,"description": string,"fault": string | null,"id": number,"kind": string,"opener_id": string,"order_id": number,"outcome": string | null,"prev_status": string,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"video_upload_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"fault"?: string | null,"id"?: never,"kind": string,"opener_id": string,"order_id": number,"outcome"?: string | null,"prev_status": string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"video_upload_id"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"fault"?: string | null,"id"?: never,"kind"?: string,"opener_id"?: string,"order_id"?: number,"outcome"?: string | null,"prev_status"?: string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"video_upload_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "disputes_opener_id_fkey"
      columns: ["opener_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disputes_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disputes_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disputes_video_upload_id_fkey"
      columns: ["video_upload_id"]
isOneToOne: false
      referencedRelation: "video_uploads"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "addressee_id": string,"created_at": string,"id": number,"requester_id": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_id": string,"created_at"?: string,"id"?: never,"requester_id": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "addressee_id"?: string,"created_at"?: string,"id"?: never,"requester_id"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "breeding_proof_path": string | null,"city": string | null,"created_at": string,"description": string,"emerged_on": string | null,"generation": string | null,"id": number,"is_live": boolean | null,"origin": string | null,"origin_is_taiwan": boolean,"price": number,"sale_type": string,"scientific_name": string | null,"seller_id": string,"sex": string,"shipping_methods": (string)[],"size_mm": number | null,"species_id": number | null,"stage": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "breeding_proof_path"?: string | null,"city"?: string | null,"created_at"?: string,"description"?: string,"emerged_on"?: string | null,"generation"?: string | null,"id"?: never,"is_live"?: never,"origin"?: string | null,"origin_is_taiwan"?: boolean,"price": number,"sale_type"?: string,"scientific_name"?: string | null,"seller_id": string,"sex"?: string,"shipping_methods": (string)[],"size_mm"?: number | null,"species_id"?: number | null,"stage": string,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "breeding_proof_path"?: string | null,"city"?: string | null,"created_at"?: string,"description"?: string,"emerged_on"?: string | null,"generation"?: string | null,"id"?: never,"is_live"?: never,"origin"?: string | null,"origin_is_taiwan"?: boolean,"price"?: number,"sale_type"?: string,"scientific_name"?: string | null,"seller_id"?: string,"sex"?: string,"shipping_methods"?: (string)[],"size_mm"?: number | null,"species_id"?: number | null,"stage"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "species"
      referencedColumns: ["id"]
    }
                  ]
                },"media": {
                  Row: {
                    "attached_id": number | null,"attached_type": string | null,"created_at": string,"height": number | null,"id": number,"kind": string,"owner_id": string,"path": string | null,"position": number,"status": string,"video_upload_id": number | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attached_id"?: number | null,"attached_type"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: never,"kind": string,"owner_id": string,"path"?: string | null,"position"?: number,"status"?: string,"video_upload_id"?: number | null,"width"?: number | null
                  }
                  Update: {
                    "attached_id"?: number | null,"attached_type"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: never,"kind"?: string,"owner_id"?: string,"path"?: string | null,"position"?: number,"status"?: string,"video_upload_id"?: number | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_video_upload_id_fkey"
      columns: ["video_upload_id"]
isOneToOne: false
      referencedRelation: "video_uploads"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": number,"created_at": string,"id": number,"image_path": string | null,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"conversation_id": number,"created_at"?: string,"id"?: never,"image_path"?: string | null,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: number,"created_at"?: string,"id"?: never,"image_path"?: string | null,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_log": {
                  Row: {
                    "action": string,"created_at": string,"id": number,"mod_id": string | null,"note": string | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: never,"mod_id"?: string | null,"note"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: never,"mod_id"?: string | null,"note"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_log_mod_id_fkey"
      columns: ["mod_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_settings": {
                  Row: {
                    "enabled": boolean,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"type": string,"user_id": string
                  }
                  Update: {
                    "enabled"?: boolean,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"created_at": string,"id": number,"link": string | null,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: never,"link"?: string | null,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: never,"link"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"amount": number | null,"created_at": string,"detail": NonNullable<Json>,"from_status": string | null,"id": number,"order_id": number,"to_status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"amount"?: number | null,"created_at"?: string,"detail"?: NonNullable<Json>,"from_status"?: string | null,"id"?: never,"order_id": number,"to_status"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"amount"?: number | null,"created_at"?: string,"detail"?: NonNullable<Json>,"from_status"?: string | null,"id"?: never,"order_id"?: number,"to_status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_messages": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"order_id": number,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: never,"order_id": number,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"order_id"?: number,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_messages_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_payment_info": {
                  Row: {
                    "account_name": string | null,"account_no": string | null,"bank_code": string | null,"meetup_place": string | null,"meetup_time": string | null,"method": string,"order_id": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_name"?: string | null,"account_no"?: string | null,"bank_code"?: string | null,"meetup_place"?: string | null,"meetup_time"?: string | null,"method": string,"order_id": number,"updated_at"?: string
                  }
                  Update: {
                    "account_name"?: string | null,"account_no"?: string | null,"bank_code"?: string | null,"meetup_place"?: string | null,"meetup_time"?: string | null,"method"?: string,"order_id"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_payment_info_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "amount": number,"auto_complete_at": string | null,"buyer_id": string,"buyer_note": string | null,"closed_at": string | null,"created_at": string,"id": number,"listing_id": number,"pay_by": string | null,"seller_id": string,"shipped_at": string | null,"shipping_method": string | null,"source": string,"status": string,"tracking_no": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"auto_complete_at"?: string | null,"buyer_id": string,"buyer_note"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: never,"listing_id": number,"pay_by"?: string | null,"seller_id": string,"shipped_at"?: string | null,"shipping_method"?: string | null,"source": string,"status": string,"tracking_no"?: string | null
                  }
                  Update: {
                    "amount"?: number,"auto_complete_at"?: string | null,"buyer_id"?: string,"buyer_note"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: never,"listing_id"?: number,"pay_by"?: string | null,"seller_id"?: string,"shipped_at"?: string | null,"shipping_method"?: string | null,"source"?: string,"status"?: string,"tracking_no"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"page_views_daily": {
                  Row: {
                    "day": string,"path": string,"views": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"path": string,"views"?: number
                  }
                  Update: {
                    "day"?: string,"path"?: string,"views"?: number
                  }
                  Relationships: [
                    
                  ]
                },"payment_reports": {
                  Row: {
                    "amount": number,"created_at": string,"id": number,"last5": string | null,"method": string,"order_id": number,"paid_at": string,"screenshot_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: never,"last5"?: string | null,"method": string,"order_id": number,"paid_at": string,"screenshot_path"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: never,"last5"?: string | null,"method"?: string,"order_id"?: number,"paid_at"?: string,"screenshot_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_reports_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"post_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"body": string,"category": string,"comment_count": number,"created_at": string,"id": number,"like_count": number,"species_id": number | null,"status": string,"title": string,"updated_at": string,"youtube_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"category": string,"comment_count"?: number,"created_at"?: string,"id"?: never,"like_count"?: number,"species_id"?: number | null,"status"?: string,"title": string,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"category"?: string,"comment_count"?: number,"created_at"?: string,"id"?: never,"like_count"?: number,"species_id"?: number | null,"status"?: string,"title"?: string,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "species"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"ban_reason": string | null,"banned_until": string | null,"bio": string | null,"city": string | null,"completed_orders": number,"created_at": string,"credit_score": number,"dm_friends_only": boolean,"id": string,"onboarded": boolean,"role": string,"strikes": number,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"ban_reason"?: string | null,"banned_until"?: string | null,"bio"?: string | null,"city"?: string | null,"completed_orders"?: number,"created_at"?: string,"credit_score"?: number,"dm_friends_only"?: boolean,"id": string,"onboarded"?: boolean,"role"?: string,"strikes"?: number,"username": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"ban_reason"?: string | null,"banned_until"?: string | null,"bio"?: string | null,"city"?: string | null,"completed_orders"?: number,"created_at"?: string,"credit_score"?: number,"dm_friends_only"?: boolean,"id"?: string,"onboarded"?: boolean,"role"?: string,"strikes"?: number,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"detail": string | null,"handled_at": string | null,"handled_by": string | null,"id": number,"note": string | null,"reason": string,"reporter_id": string,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detail"?: string | null,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: never,"note"?: string | null,"reason": string,"reporter_id": string,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"detail"?: string | null,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: never,"note"?: string | null,"reason"?: string,"reporter_id"?: string,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"order_id": number,"rating": number,"reviewee_id": string,"reviewee_role": string,"reviewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"id"?: never,"order_id": number,"rating": number,"reviewee_id": string,"reviewee_role": string,"reviewer_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"order_id"?: number,"rating"?: number,"reviewee_id"?: string,"reviewee_role"?: string,"reviewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"seller_payout_accounts": {
                  Row: {
                    "account_name": string,"account_no": string,"bank_code": string,"created_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_name": string,"account_no": string,"bank_code": string,"created_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "account_name"?: string,"account_no"?: string,"bank_code"?: string,"created_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_payout_accounts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "address": string | null,"boarding": boolean | null,"boarding_note": string | null,"city": string,"created_at": string,"district": string | null,"facebook": string | null,"hours_note": string | null,"id": number,"instagram": string | null,"items": string | null,"last_verified_on": string | null,"lat": number | null,"lng": number | null,"name": string,"opening_hours": Json | null,"phone": string | null,"source_url": string | null,"status": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"boarding"?: boolean | null,"boarding_note"?: string | null,"city": string,"created_at"?: string,"district"?: string | null,"facebook"?: string | null,"hours_note"?: string | null,"id"?: never,"instagram"?: string | null,"items"?: string | null,"last_verified_on"?: string | null,"lat"?: number | null,"lng"?: number | null,"name": string,"opening_hours"?: Json | null,"phone"?: string | null,"source_url"?: string | null,"status"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"boarding"?: boolean | null,"boarding_note"?: string | null,"city"?: string,"created_at"?: string,"district"?: string | null,"facebook"?: string | null,"hours_note"?: string | null,"id"?: never,"instagram"?: string | null,"items"?: string | null,"last_verified_on"?: string | null,"lat"?: number | null,"lng"?: number | null,"name"?: string,"opening_hours"?: Json | null,"phone"?: string | null,"source_url"?: string | null,"status"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"site_daily_stats": {
                  Row: {
                    "day": string,"views": number,"visitors": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"views"?: number,"visitors"?: number
                  }
                  Update: {
                    "day"?: string,"views"?: number,"visitors"?: number
                  }
                  Relationships: [
                    
                  ]
                },"species": {
                  Row: {
                    "aliases": string,"common_name": string,"created_at": string,"family_group": string,"genus": string,"id": number,"is_native_tw": boolean,"is_protected": boolean,"japanese_name": string | null,"scientific_name": string,"search_text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: string,"common_name": string,"created_at"?: string,"family_group": string,"genus": string,"id"?: never,"is_native_tw"?: boolean,"is_protected"?: boolean,"japanese_name"?: string | null,"scientific_name": string,"search_text"?: never
                  }
                  Update: {
                    "aliases"?: string,"common_name"?: string,"created_at"?: string,"family_group"?: string,"genus"?: string,"id"?: never,"is_native_tw"?: boolean,"is_protected"?: boolean,"japanese_name"?: string | null,"scientific_name"?: string,"search_text"?: never
                  }
                  Relationships: [
                    
                  ]
                },"species_follows": {
                  Row: {
                    "created_at": string,"species_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"species_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"species_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "species_follows_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "species"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "species_follows_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"species_submissions": {
                  Row: {
                    "common_name": string,"created_at": string,"family_group": string,"id": number,"japanese_name": string | null,"note": string | null,"scientific_name": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "common_name": string,"created_at"?: string,"family_group": string,"id"?: never,"japanese_name"?: string | null,"note"?: string | null,"scientific_name": string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "common_name"?: string,"created_at"?: string,"family_group"?: string,"id"?: never,"japanese_name"?: string | null,"note"?: string | null,"scientific_name"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "species_submissions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"specimen_events": {
                  Row: {
                    "event_type": string,"id": number,"note": string | null,"occurred_on": string,"specimen_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "event_type": string,"id"?: never,"note"?: string | null,"occurred_on": string,"specimen_id": number
                  }
                  Update: {
                    "event_type"?: string,"id"?: never,"note"?: string | null,"occurred_on"?: string,"specimen_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "specimen_events_specimen_id_fkey"
      columns: ["specimen_id"]
isOneToOne: false
      referencedRelation: "specimens"
      referencedColumns: ["id"]
    }
                  ]
                },"specimen_measurements": {
                  Row: {
                    "head_width_mm": number | null,"id": number,"measured_on": string,"note": string | null,"specimen_id": number,"weight_g": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "head_width_mm"?: number | null,"id"?: never,"measured_on": string,"note"?: string | null,"specimen_id": number,"weight_g"?: number | null
                  }
                  Update: {
                    "head_width_mm"?: number | null,"id"?: never,"measured_on"?: string,"note"?: string | null,"specimen_id"?: number,"weight_g"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "specimen_measurements_specimen_id_fkey"
      columns: ["specimen_id"]
isOneToOne: false
      referencedRelation: "specimens"
      referencedColumns: ["id"]
    }
                  ]
                },"specimens": {
                  Row: {
                    "bloodline_name": string | null,"created_at": string,"dam_id": number | null,"died_on": string | null,"emerged_on": string | null,"final_size_mm": number | null,"generation": string | null,"hatched_on": string | null,"id": number,"label": string,"notes": string | null,"origin": string | null,"owner_id": string,"sex": string,"sire_id": number | null,"species_id": number,"stage": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bloodline_name"?: string | null,"created_at"?: string,"dam_id"?: number | null,"died_on"?: string | null,"emerged_on"?: string | null,"final_size_mm"?: number | null,"generation"?: string | null,"hatched_on"?: string | null,"id"?: never,"label": string,"notes"?: string | null,"origin"?: string | null,"owner_id": string,"sex"?: string,"sire_id"?: number | null,"species_id": number,"stage"?: string,"visibility"?: string
                  }
                  Update: {
                    "bloodline_name"?: string | null,"created_at"?: string,"dam_id"?: number | null,"died_on"?: string | null,"emerged_on"?: string | null,"final_size_mm"?: number | null,"generation"?: string | null,"hatched_on"?: string | null,"id"?: never,"label"?: string,"notes"?: string | null,"origin"?: string | null,"owner_id"?: string,"sex"?: string,"sire_id"?: number | null,"species_id"?: number,"stage"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "specimens_dam_id_fkey"
      columns: ["dam_id"]
isOneToOne: false
      referencedRelation: "specimens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "specimens_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "specimens_sire_id_fkey"
      columns: ["sire_id"]
isOneToOne: false
      referencedRelation: "specimens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "specimens_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "species"
      referencedColumns: ["id"]
    }
                  ]
                },"temperature_logs": {
                  Row: {
                    "humidity": number | null,"id": number,"location": string | null,"logged_on": string,"owner_id": string,"specimen_id": number | null,"temp_c": number
                  }
                  ComputedFields: never
                  Insert: {
                    "humidity"?: number | null,"id"?: never,"location"?: string | null,"logged_on": string,"owner_id": string,"specimen_id"?: number | null,"temp_c": number
                  }
                  Update: {
                    "humidity"?: number | null,"id"?: never,"location"?: string | null,"logged_on"?: string,"owner_id"?: string,"specimen_id"?: number | null,"temp_c"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "temperature_logs_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "temperature_logs_specimen_id_fkey"
      columns: ["specimen_id"]
isOneToOne: false
      referencedRelation: "specimens"
      referencedColumns: ["id"]
    }
                  ]
                },"user_follows": {
                  Row: {
                    "created_at": string,"followee_id": string,"follower_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"followee_id": string,"follower_id": string
                  }
                  Update: {
                    "created_at"?: string,"followee_id"?: string,"follower_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_follows_followee_id_fkey"
      columns: ["followee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"video_uploads": {
                  Row: {
                    "created_at": string,"delete_after": string | null,"duration_sec": number | null,"id": number,"owner_id": string,"purpose": string,"status": string,"stream_uid": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delete_after"?: string | null,"duration_sec"?: number | null,"id"?: never,"owner_id": string,"purpose": string,"status"?: string,"stream_uid": string
                  }
                  Update: {
                    "created_at"?: string,"delete_after"?: string | null,"duration_sec"?: number | null,"id"?: never,"owner_id"?: string,"purpose"?: string,"status"?: string,"stream_uid"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_uploads_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wanted_listings": {
                  Row: {
                    "budget": number | null,"city": string | null,"created_at": string,"description": string,"id": number,"species_id": number | null,"status": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget"?: number | null,"city"?: string | null,"created_at"?: string,"description"?: string,"id"?: never,"species_id"?: number | null,"status"?: string,"title": string,"user_id": string
                  }
                  Update: {
                    "budget"?: number | null,"city"?: string | null,"created_at"?: string,"description"?: string,"id"?: never,"species_id"?: number | null,"status"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wanted_listings_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "species"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wanted_listings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "profile_ratings": {
                  Row: {
                    "avg_rating": number | null,"review_count": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "admin_set_role":
{ Args: { "p_role": string,"p_user": string }; Returns: undefined
                           },
"are_friends":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"auction_bid_history":
{ Args: { "p_listing": number }; Returns: {
              "amount": number,"bidder": string,"created_at": string,"id": number,"is_auto": boolean,"is_me": boolean
            }[]
                           },
"buy_now":
{ Args: { "p_listing": number }; Returns: number
                           },
"can_view_specimen":
{ Args: { "sid": number }; Returns: boolean
                           },
"cancel_auction":
{ Args: { "p_listing": number,"p_reason": string }; Returns: undefined
                           },
"create_auction":
{ Args: { "p_buy_now"?: number,"p_ends_at": string,"p_listing": number,"p_min_increment": number,"p_reserve"?: number,"p_start_price": number }; Returns: undefined
                           },
"create_order":
{ Args: { "p_listing": number,"p_note"?: string,"p_shipping": string }; Returns: number
                           },
"is_active":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_mod":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_order_party":
{ Args: { "oid": number }; Returns: boolean
                           },
"mark_conversation_read":
{ Args: { "p_conv": number }; Returns: undefined
                           },
"mod_ban":
{ Args: { "p_days": number,"p_reason": string,"p_user": string }; Returns: undefined
                           },
"mod_handle_report":
{ Args: { "p_id": number,"p_note"?: string,"p_status": string }; Returns: undefined
                           },
"mod_review_submission":
{ Args: { "p_approve": boolean,"p_id": number }; Returns: undefined
                           },
"mod_set_hidden":
{ Args: { "p_hidden": boolean,"p_id": number,"p_note"?: string,"p_type": string }; Returns: undefined
                           },
"order_transition":
{ Args: { "p_action": string,"p_order": number,"p_payload"?: Json }; Returns: string
                           },
"owns_specimen":
{ Args: { "sid": number }; Returns: boolean
                           },
"payment_account_is_new":
{ Args: { "p_order": number }; Returns: boolean
                           },
"place_bid":
{ Args: { "p_listing": number,"p_max": number }; Returns: Json
                           },
"record_view":
{ Args: { "p_path": string,"p_visitor": string }; Returns: undefined
                           },
"remove_friend":
{ Args: { "p_target": string }; Returns: undefined
                           },
"resolve_dispute":
{ Args: { "p_fault": string,"p_note": string,"p_order": number,"p_outcome": string }; Returns: undefined
                           },
"respond_friend_request":
{ Args: { "p_accept": boolean,"p_id": number }; Returns: undefined
                           },
"send_friend_request":
{ Args: { "p_target": string }; Returns: string
                           },
"send_message":
{ Args: { "p_body": string,"p_image_path"?: string,"p_recipient": string }; Returns: number
                           },
"set_payment_info":
{ Args: { "p_account_name"?: string,"p_account_no"?: string,"p_bank_code"?: string,"p_meetup_place"?: string,"p_meetup_time"?: string,"p_method": string,"p_order": number }; Returns: undefined
                           },
"site_totals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"submit_review":
{ Args: { "p_body"?: string,"p_order": number,"p_rating": number }; Returns: undefined
                           },
"unread_counts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"video_daily_limit":
{ Args: { "p_user": string }; Returns: number
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
