import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Khuyến nghị dùng SERVICE_ROLE_KEY nếu có, không thì dùng ANON_KEY
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Thiếu cấu hình biến môi trường Supabase.' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // THAO TÁC ĐỌC: Truy vấn 1 bản ghi bất kỳ (Ví dụ từ bảng tasks đã có trong db)
    // Việc gọi API này qua REST đủ để Supabase ghi nhận có hoạt động trên DB
    const { data: readData, error: readError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);

    if (readError) {
      console.error('Lỗi khi đọc từ Supabase (Cron Keep Alive):', readError);
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    // THAO TÁC GHI (Optional): 
    // Ghi một bản ghi log. Nếu bảng `keep_alive_logs` chưa có, nó sẽ lỗi (có thể bỏ qua)
    const { error: writeError } = await supabase
      .from('keep_alive_logs')
      .insert([{ 
        pinged_at: new Date().toISOString(),
        message: 'Auto keep-alive ping'
      }]);

    return NextResponse.json({
      success: true,
      message: 'Đã thực hiện ping Supabase thành công.',
      read_status: 'ok',
      write_status: writeError ? `Bỏ qua ghi (có thể bảng keep_alive_logs chưa tồn tại): ${writeError.message}` : 'Ghi thành công',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Lỗi trong tiến trình Cron Keep Alive:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
