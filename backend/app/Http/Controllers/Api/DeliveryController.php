<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function update(Request $request, $id)
    {
        $delivery = Delivery::findOrFail($id);
        $data = $request->only(['contact_number','delivery_address','delivery_lead_time_days','courier','tracking_number','status','delivery_date','notes']);
        $delivery->update($data);
        return response()->json(['success' => true, 'data' => $delivery]);
    }

    public function create(Request $request)
    {
        $this->validate($request, ['order_id' => 'required|exists:orders,id']);
        $data = $request->only(['order_id','order_level_id','contact_number','delivery_address','delivery_lead_time_days','courier','tracking_number','status','delivery_date','notes']);
        $delivery = Delivery::create($data);
        return response()->json(['success' => true, 'data' => $delivery]);
    }
}
