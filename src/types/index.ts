export interface Competition {
  name: string
  status: 'waiting' | 'active' | 'finished'
  voting_open: boolean
  show_podium: boolean
  show_leaderboard: boolean
  current_group_id: string | null
  admin_password?: string  // DB'de saklanır; UI'dan değiştirilebilir
  admin_session_id?: string  // Tek-oturum zorlaması için; her girişte yenilenir
}

export interface Group {
  id: string
  name: string
  order_index: number
  status: 'pending' | 'active' | 'locked'
  score_revealed: boolean
  score_revealed_at?: string  // ISO; her açıklamada güncellenir, display animasyon tetiği
}

export interface Jury {
  id: string
  name: string
  display_order: number
  access_code: string | null
}

export interface Vote {
  id: string
  group_id: string
  jury_id: string
  criteria_1: number
  criteria_2: number
  criteria_3: number
  criteria_4: number
  criteria_5: number
  total: number
  submitted_at: string
}

export interface GroupWithScore extends Group {
  total_score: number
  vote_count: number
  average_score: number
}

export interface DBState {
  competition: Competition
  groups: Group[]
  juries: Jury[]
  votes: Vote[]
}
