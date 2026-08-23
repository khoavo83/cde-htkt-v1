import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách kế hoạch vốn, các quyết định giao vốn và ma trận tổng hợp theo năm
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Thiếu projectId' }, { status: 400 });
    }

    const [plansRes, allocRes, verRes] = await Promise.all([
      supabase.from('capital_plans').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('capital_allocations').select('*').eq('project_id', projectId).order('decision_date', { ascending: true }),
      supabase.from('investment_versions').select('*').eq('project_id', projectId).eq('is_active', true).maybeSingle()
    ]);

    if (plansRes.error) throw plansRes.error;
    if (allocRes.error) throw allocRes.error;

    const plans = plansRes.data || [];
    const allocations = allocRes.data || [];
    const activeVersion = verRes.data || null;

    // Tổng hợp Ma trận Vốn theo từng năm (2026, 2027, 2028...)
    const yearSummary = {};
    allocations.forEach(a => {
      const yr = a.year || new Date().getFullYear();
      if (!yearSummary[yr]) {
        yearSummary[yr] = {
          year: yr,
          totalAllocated: 0,
          phases: [],
          bySource: {}
        };
      }
      yearSummary[yr].totalAllocated += Number(a.amount || 0);
      yearSummary[yr].phases.push(a);

      const src = a.source_type || 'Ngân sách Thành phố';
      yearSummary[yr].bySource[src] = (yearSummary[yr].bySource[src] || 0) + Number(a.amount || 0);
    });

    const matrixYears = Object.values(yearSummary).sort((a, b) => a.year - b.year);

    // Kế hoạch trung hạn
    const midTermPlan = plans.find(p => p.plan_type === 'trung_han') || null;

    return NextResponse.json({
      success: true,
      plans: plans,
      allocations: allocations,
      midTermPlan: midTermPlan,
      matrixYears: matrixYears,
      totalTMDT: activeVersion ? Number(activeVersion.total_after_tax || 0) : 0
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu kế hoạch vốn:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo kế hoạch vốn hoặc quyết định giao vốn mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { type } = body; // 'plan' hoặc 'allocation'

    if (type === 'plan') {
      const { projectId, planType, title, periodStartYear, periodEndYear, plannedAmount, fundingSource, priorityLevel, notes } = body;
      const { data, error } = await supabase
        .from('capital_plans')
        .insert({
          project_id: projectId,
          plan_type: planType || 'hang_nam',
          title: title,
          period_start_year: periodStartYear ? Number(periodStartYear) : null,
          period_end_year: periodEndYear ? Number(periodEndYear) : null,
          planned_amount: Number(plannedAmount || 0),
          funding_source: fundingSource || 'Ngân sách Thành phố',
          priority_level: priorityLevel || 'high',
          notes: notes || ''
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, plan: data });
    } else {
      // allocation
      const { capitalPlanId, projectId, decisionNo, decisionDate, year, allocationPhase, amount, sourceType, documentPath, status, extendedYear, notes } = body;
      const { data, error } = await supabase
        .from('capital_allocations')
        .insert({
          capital_plan_id: capitalPlanId || null,
          project_id: projectId,
          decision_no: decisionNo,
          decision_date: decisionDate || null,
          year: Number(year || new Date().getFullYear()),
          allocation_phase: allocationPhase || 'Giao đầu năm',
          amount: Number(amount || 0),
          source_type: sourceType || 'Ngân sách Thành phố',
          document_path: documentPath || '',
          status: status || 'effective',
          extended_year: extendedYear ? Number(extendedYear) : null,
          notes: notes || ''
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, allocation: data });
    }
  } catch (error) {
    console.error('Lỗi khi tạo kế hoạch/giao vốn:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật quyết định giao vốn
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, type } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 });
    }

    if (type === 'plan') {
      const { title, planType, periodStartYear, periodEndYear, plannedAmount, fundingSource, notes } = body;
      const { data, error } = await supabase
        .from('capital_plans')
        .update({
          title,
          plan_type: planType,
          period_start_year: periodStartYear ? Number(periodStartYear) : null,
          period_end_year: periodEndYear ? Number(periodEndYear) : null,
          planned_amount: Number(plannedAmount || 0),
          funding_source: fundingSource,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, plan: data });
    } else {
      const { decisionNo, decisionDate, year, allocationPhase, amount, sourceType, documentPath, status, extendedYear, notes } = body;
      const { data, error } = await supabase
        .from('capital_allocations')
        .update({
          decision_no: decisionNo,
          decision_date: decisionDate || null,
          year: Number(year || new Date().getFullYear()),
          allocation_phase: allocationPhase,
          amount: Number(amount || 0),
          source_type: sourceType,
          document_path: documentPath,
          status,
          extended_year: extendedYear ? Number(extendedYear) : null,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, allocation: data });
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật kế hoạch/giao vốn:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa kế hoạch hoặc giao vốn
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'plan' hoặc 'allocation'

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 });
    }

    const table = type === 'plan' ? 'capital_plans' : 'capital_allocations';
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xóa kế hoạch/giao vốn:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
