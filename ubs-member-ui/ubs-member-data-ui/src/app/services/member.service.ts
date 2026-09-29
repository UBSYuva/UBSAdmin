import { Router } from '@angular/router';
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Service to handle the authentication of the user
 * This service is used to signup, signin and logout the user using basic authentication
 */
@Injectable()
export class MemberService {

    APIHost = environment.APIHost;
    constructor(
        public http: HttpClient,
        public router: Router
    ) { }

    getMemberMaster(page: number = 1, pageSize: number = 25, filter: string = '', sortColumn: string = '', sortDirection: string = 'asc', paginate: boolean = true) {
        if (!paginate) {
            return this.http.get<any>(`${this.APIHost}/api/memberdata?paginate=false`);
        }
        let params: any = { page: page.toString(), pageSize: pageSize.toString() };
        if (filter) params['filter'] = filter;
        if (sortColumn) params['sortColumn'] = sortColumn;
        if (sortDirection) params['sortDirection'] = sortDirection;

        return this.http.get<any>(`${this.APIHost}/api/memberdata`, { params });
    }

    getShubhechhakMemberMaster(page: number = 1, pageSize: number = 25, filter: string = '', sortColumn: string = '', sortDirection: string = 'asc', paginate: boolean = true) {
        if (!paginate) {
            return this.http.get<any>(`${this.APIHost}/api/memberdata/shubhechhak?paginate=false`);
        }
        let params: any = { page: page.toString(), pageSize: pageSize.toString() };
        if (filter) params['filter'] = filter;
        if (sortColumn) params['sortColumn'] = sortColumn;
        if (sortDirection) params['sortDirection'] = sortDirection;

        return this.http.get<any>(`${this.APIHost}/api/memberdata/shubhechhak`, { params });
    }

    getDonationData(year?: any, month: any = null, filter?: string, date?: string, donationType?: string, page: number = 1, pageSize: number = 25, sortColumn: string = '', sortDirection: string = 'desc', paginate: boolean = true) {
        let params: any = {};
        if (year) params['year'] = year;
        if (month !== null && month !== undefined && month !== '') params['month'] = month;
        if (filter) params['filter'] = filter;
        if (date) params['date'] = date;
        if (donationType) params['donationType'] = donationType;
        if (!paginate) {
            params['paginate'] = 'false';
        } else {
            params['page'] = page.toString();
            params['pageSize'] = pageSize.toString();
            if (sortColumn) params['sortColumn'] = sortColumn;
            if (sortDirection) params['sortDirection'] = sortDirection;
        }
        
        return this.http.get<any>(`${this.APIHost}/api/memberdata/donationData`, { params });
    }

    getMemberInfo(id) {
        return this.http.get<any>(`${this.APIHost}/api/memberdata/${id}`);
    }

    getMemberByMemberId(memberId: string): Observable<any> {
        return this.http.get<any>(`${this.APIHost}/api/memberdata/fetchByMemberId/${memberId}`);
    }

    addUpdateMemberInfo(id, request: any, isAdd) {
        if (isAdd) {
            return this.http.post(`${this.APIHost}/api/memberdata`, request);
        }
        else {
            return this.http.put(`${this.APIHost}/api/memberdata/${id}`, request);
        }
    }

    addUpdateShubhechhakMemberInfo(id, request: any, isAdd) {
        if (isAdd) {
            return this.http.post(`${this.APIHost}/api/memberdata/shubhechhak`, request);
        }
        else {
            return this.http.put(`${this.APIHost}/api/memberdata/shubhechhak/${id}`, request);
        }
    }

    getBloodGroupMaster() {
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/bloodGroup`).pipe(
            map(response => response)
        );
    }

    getRelationMaster() {
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/relation`).pipe(
            map(response => response)
        );
    }

    getMarriageStatusMaster() {
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/marriageStatus`).pipe(
            map(response => response)
        );
    }

    getProfessionMaster() {
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/profession`).pipe(
            map(response => response)
        );
    }

    getCityMaster() {
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/city`).pipe(
            map(response => response)
        );
    }

    getShubhechhakCityMaster() {
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/shubhechhakCity`).pipe(
            map(response => response)
        );
    }

    getTotalDonation(filter?: string, date?: string) {
        let params = {};
        if (filter) params['filter'] = filter;
        if (date) params['date'] = date;
        
        return this.http.get<any[]>(`${this.APIHost}/api/memberdata/getTotalDonation`, { params });
    }

    deleteMember(id) {
        return this.http.delete(`${this.APIHost}/api/memberdata/${id}`);
    }

    deleteShubhechhakMember(id) {
        return this.http.delete(`${this.APIHost}/api/memberdata/shubhechhak/${id}`);
    }

    deleteDonation(id) {
        return this.http.delete(`${this.APIHost}/api/memberdata/donation/${id}`);
    }

    downloadDonationData() {
        return this.http.get(`${this.APIHost}/api/memberdata/downloadDonationData`, { responseType: 'blob' });
    }

    downloadDonationPDF() {
        return this.http.get(`${this.APIHost}/api/memberdata/downloadDonationPDF`, { responseType: 'blob' });
    }

    downloadMemberPDF() {
        return this.http.get(`${this.APIHost}/api/memberdata/downloadMemberPDF`, { responseType: 'blob' });
    }

    downloadShubhechhakPDF() {
        return this.http.get(`${this.APIHost}/api/memberdata/downloadShubhechhakPDF`, { responseType: 'blob' });
    }

    depositeAmount(request) {
        return this.http.post(`${this.APIHost}/api/memberdata/donation`, request, { responseType: 'blob' });
    }

    getAppPin(): Observable<any> {
        return this.http.get<any>(`${this.APIHost}/api/memberdata/appPin`);
    }

}
