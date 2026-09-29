import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../models/models.dart';
import '../services/api_service.dart';

// Events
abstract class InvoiceGeneratorEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class SearchMemberEvent extends InvoiceGeneratorEvent {
  final String memberId;
  SearchMemberEvent(this.memberId);
  @override
  List<Object?> get props => [memberId];
}

class SubmitDonationEvent extends InvoiceGeneratorEvent {
  final Map<String, dynamic> requestData;
  final bool generateOnly;
  final bool saveOnly;
  SubmitDonationEvent(this.requestData, {this.generateOnly = false, this.saveOnly = false});
  @override
  List<Object?> get props => [requestData, generateOnly, saveOnly];
}

class LoadDonationHistoryEvent extends InvoiceGeneratorEvent {}

class LoadTodayDonationsEvent extends InvoiceGeneratorEvent {}

class LoadYearlyTransactionsEvent extends InvoiceGeneratorEvent {
  final String year;
  LoadYearlyTransactionsEvent(this.year);
  @override
  List<Object?> get props => [year];
}

class ResetFormEvent extends InvoiceGeneratorEvent {}

class LoadMastersEvent extends InvoiceGeneratorEvent {}

// States
abstract class InvoiceGeneratorState extends Equatable {
  @override
  List<Object?> get props => [];
}

class InvoiceGeneratorInitial extends InvoiceGeneratorState {}

class MemberSearchLoading extends InvoiceGeneratorState {}

class MemberFoundState extends InvoiceGeneratorState {
  final Member member;
  MemberFoundState(this.member);
  @override
  List<Object?> get props => [member];
}

class MemberNotFoundState extends InvoiceGeneratorState {
  final String memberId;
  MemberNotFoundState(this.memberId);
  @override
  List<Object?> get props => [memberId];
}

class DonationSubmitting extends InvoiceGeneratorState {}

class DonationSuccessState extends InvoiceGeneratorState {
  final dynamic file; // File on Mobile, Uint8List on Web
  final String message;
  DonationSuccessState(this.file, this.message);
  @override
  List<Object?> get props => [file, message];
}

class DonationErrorState extends InvoiceGeneratorState {
  final String error;
  DonationErrorState(this.error);
  @override
  List<Object?> get props => [error];
}

class DonationHistoryLoading extends InvoiceGeneratorState {}

class DonationHistoryLoaded extends InvoiceGeneratorState {
  final List<DonationSummary> summaries;
  DonationHistoryLoaded(this.summaries);
  @override
  List<Object?> get props => [summaries];
}

class TodayDonationsLoaded extends InvoiceGeneratorState {
  final List<Transaction> transactions;
  final double totalToday;
  TodayDonationsLoaded(this.transactions, this.totalToday);
  @override
  List<Object?> get props => [transactions, totalToday];
}

class YearlyTransactionsLoading extends InvoiceGeneratorState {}

class YearlyTransactionsLoaded extends InvoiceGeneratorState {
  final List<Transaction> transactions;
  final String year;
  final List<DonationSummary> summaries;
  YearlyTransactionsLoaded(this.transactions, this.year, this.summaries);
  @override
  List<Object?> get props => [transactions, year, summaries];
}

class MastersLoadedState extends InvoiceGeneratorState {
  final Map<String, List<String>> masters;
  MastersLoadedState(this.masters);
  @override
  List<Object?> get props => [masters];
}

// Bloc
class InvoiceGeneratorBloc extends Bloc<InvoiceGeneratorEvent, InvoiceGeneratorState> {
  final ApiService apiService;

  InvoiceGeneratorBloc(this.apiService) : super(InvoiceGeneratorInitial()) {
    on<SearchMemberEvent>(_onSearchMember);
    on<SubmitDonationEvent>(_onSubmitDonation);
    on<LoadDonationHistoryEvent>(_onLoadHistory);
    on<LoadTodayDonationsEvent>(_onLoadTodayDonations);
    on<LoadMastersEvent>(_onLoadMasters);
    on<LoadYearlyTransactionsEvent>(_onLoadYearlyTransactions);
    on<ResetFormEvent>((event, emit) => emit(InvoiceGeneratorInitial()));
  }

  Future<void> _onSearchMember(SearchMemberEvent event, Emitter<InvoiceGeneratorState> emit) async {
    emit(MemberSearchLoading());
    final member = await apiService.fetchMemberByMemberId(event.memberId);
    if (member != null) {
      emit(MemberFoundState(member));
    } else {
      emit(MemberNotFoundState(event.memberId));
    }
  }

  Future<void> _onSubmitDonation(SubmitDonationEvent event, Emitter<InvoiceGeneratorState> emit) async {
    emit(DonationSubmitting());
    final result = await apiService.submitDonation(event.requestData, 
      generateOnly: event.generateOnly,
      saveOnly: event.saveOnly,
    );
    
    if (result != null) {
      if (event.saveOnly) {
        final successMsg = (result is Map) 
            ? (result['message'] ?? 'Donation saved successfully!') 
            : 'Donation saved successfully!';
        emit(DonationSuccessState(null, successMsg.toString()));
      } else {
        final message = event.generateOnly 
            ? 'Donation slip generated successfully!' 
            : 'Donation generated and added successfully!';
        emit(DonationSuccessState(result, message));
      }
    } else {
      emit(DonationErrorState('Error processing donation.'));
    }
  }

  List<DonationSummary> _lastSummaries = [];

  Future<void> _onLoadHistory(LoadDonationHistoryEvent event, Emitter<InvoiceGeneratorState> emit) async {
    emit(DonationHistoryLoading());
    final summaries = await apiService.getTotalDonation();
    _lastSummaries = summaries;
    emit(DonationHistoryLoaded(summaries));
  }

  Future<void> _onLoadYearlyTransactions(LoadYearlyTransactionsEvent event, Emitter<InvoiceGeneratorState> emit) async {
    emit(YearlyTransactionsLoading());
    final transactions = await apiService.getDonationData(year: event.year);
    emit(YearlyTransactionsLoaded(transactions, event.year, _lastSummaries));
  }

  Future<void> _onLoadTodayDonations(LoadTodayDonationsEvent event, Emitter<InvoiceGeneratorState> emit) async {
    emit(DonationHistoryLoading());
    final transactions = await apiService.fetchTodayDonations();
    final total = transactions.fold(0.0, (sum, tx) => sum + tx.amount);
    emit(TodayDonationsLoaded(transactions, total));
  }

  Future<void> _onLoadMasters(LoadMastersEvent event, Emitter<InvoiceGeneratorState> emit) async {
    final masters = await apiService.fetchMasters();
    emit(MastersLoadedState(masters));
  }
}
