import axios, { AxiosError } from 'axios';

type APIProps = {
  userAccessToken: string;
  accountId: number;
}

type SummaryReportFilter = {
  period: 'today' | 'last_7_days' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year';
}

type ListConversationsFilter = {
  assignee_type: 'all' | 'unassigned' | 'assigned' | 'me' | null;
  status: 'snoozed' | 'open' | 'resolved' | 'pending' | null;
  q: string | null;
  labels: string[] | null;
  page: number | null;
  sort_by: 'last_activity_at_desc' | 'created_at_desc' | 'created_at_asc' | 'priority_desc' | 'priority_asc' | 'waiting_since_asc' | 'waiting_since_desc' | null;
}

export class ChatwootAPI {
  private _baseUrl: string = 'https://app.xsales.agency';
  private _accessToken: string
  private _accountId: number


  constructor({ userAccessToken, accountId }: APIProps) {
    this._accessToken = userAccessToken;
    this._accountId = accountId;
  }

  public async getSummaryReport(filters: SummaryReportFilter) {
    // console.log('parsed filters:', this._parseFilters(filters));
    
    try {
      const response = await axios(`${this._baseUrl}/api/v2/accounts/${this._accountId}/reports/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': this._accessToken,
        },
        params: {
          ...this._parseFilters(filters),
          type: 'account',
          business_hours: false,
          timezone_offset: -3,
        }
      })
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Error on getSummaryReport', error.response?.data);
        return error.response?.data;
      }
    }
  }

  public async listConversations(filters: ListConversationsFilter) {
    // console.log('filters:', filters);    
    //remove null values from filters
    Object.keys(filters).forEach(key => filters[key as keyof ListConversationsFilter] == null && delete filters[key as keyof ListConversationsFilter]);
    // console.log('parsed filters:', filters);

    
    try {
      const response = await axios(`${this._baseUrl}/api/v1/accounts/${this._accountId}/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': this._accessToken,
        },
        params: {
          ...filters,
        }
      })
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Error on listConversations', error.response?.data);
        return error.response?.data;
      }
    }
  }

  public async getMessages(conversationId: number) {
    try {
      const response = await axios(`${this._baseUrl}/api/v1/accounts/${this._accountId}/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': this._accessToken,
        },
      })
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Error on getMessages', error.response?.data);
        return error.response?.data;
      }
    }
  }

  //recebe o enum de filters e retorna timestamps range "since" e "until"
  private _parseFilters(filters: SummaryReportFilter) {
    const now = new Date();
    let since = new Date();
  
    switch (filters.period) {
      case 'today':
        since.setHours(0, 0, 0, 0);
        break;
      case 'last_7_days':
        since.setDate(now.getDate() - 7);
        break;
      case 'last_month':
        since.setMonth(now.getMonth() - 1);
        break;
      case 'last_3_months':
        since.setMonth(now.getMonth() - 3);
        break;
      case 'last_6_months':
        since.setMonth(now.getMonth() - 6);
        break;
      case 'last_year':
        since.setFullYear(now.getFullYear() - 1);
        break;
    }
  
    return {
      since: Math.floor(since.getTime() / 1000).toString(),
      until: Math.floor(now.getTime() / 1000).toString()
    };
  }
}