import { UpdateUserDto } from './dto/update-user.dto';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { CurrentUser } from '@/decorator/customizes';
import { IUser } from '@/interfaces/user.interface';
import aqp from 'api-query-params';
import { Role, RoleDocument } from '@/roles/schemas/role.schema';


@Injectable()
export class UsersService implements OnModuleInit {

  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private configService: ConfigService
  ) {}

  async onModuleInit() {
    const count = await this.userModel.count();
    if (count === 0) {
      const salt = genSaltSync(10);
      const hash = hashSync(this.configService.get<string>("INIT_USER_PASSWORD"), salt);
      await this.userModel.insertMany([
        {
          name: "Eric",
          email: "admin@gmail.com",
          password: hash
        },
        {
          name: "User",
          email: "user@gmail.com",
          password: hash
        },
        {
          name: "User 1",
          email: "user1@gmail.com",
          password: hash
        },
        {
          name: "User 2",
          email: "user2@gmail.com",
          password: hash
        },
        {
          name: "User 3",
          email: "user3@gmail.com",
          password: hash
        }
      ])
    }
  }


  // async findAll(currentPage: number, limit: number, qs: string) {
  //   const { filter, sort, population } = aqp(qs);
  //   delete filter.current;
  //   delete filter.pageSize;

  //   let offset = (+currentPage - 1) * (+limit);
  //   let defaultLimit = +limit ? +limit : 10;

  //   const total = (await this.userModel.find(filter)).length;
  //   const totalPage = Math.ceil(total / defaultLimit);

  //   const result = await this.userModel.find(filter)
  //     .skip(offset)
  //     .limit(defaultLimit)
  //     .sort(sort as any)
  //     .select("-password")
  //     .populate(population)
  //     .exec();
  // }
  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    let offset = (+currentPage - 1) * (+limit);
    let defaultLimit = +limit ? +limit : 10;

    const total = (await this.userModel.find(filter)).length;
    const totalPage = Math.ceil(total / defaultLimit);

    const result = await this.userModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select("-password")
      .populate(population)
      .exec();

    return { result, totalPage }; // Đảm bảo trả về kết quả và tổng số trang
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  checkPassword(hash: string, plain: string) {
    return compareSync(hash, plain);
  }

  findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id))
      return 'not found user'
    return this.userModel.findOne({
      _id: id
    }).select("-password") // không lấy password
      .populate({ path: "role", select: { name: 1, _id: 1 } })
  }
  findOneByUsername(username: string) {
    return this.userModel.findOne({ email: username })
      .populate({ path: "role", select: { name: 1, permissions: 1 } });
  }

  checkUserPassword(password: string, hash: string) {
    return compareSync(password, hash);
    // sẽ trả ra true hoặc false
  }

  // async remove(id: string, user: IUser) {
  //   // không cho xóa user có emial là admin
  //   // admin@gmail.com
  //   // nếu muốn cấu hihf động thì cấu hình trong env

  //   if (!mongoose.Types.ObjectId.isValid(id))
  //     return 'not found user'
  //   // để xóa mềm gọi soft delete
  //   const foundUser = await this.userModel.findById("id");
  //   if(foundUser && foundUser.email == 'admin@gmail.com'){
  //     throw new BadRequestException("can not delete user has email admin@gmail.com")
  //   }
  //   await this.userModel.updateOne(
  //     { _id: id },
  //     {
  //       deletedBy: {
  //         _id: user._id,
  //         email: user.email
  //       }
  //     }
  //   )
  //   return this.userModel.softDelete
  //     ({
  //       _id: id
  //     })
  // }
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return 'not found user';
    }

    const foundUser = await this.userModel.findById(id); // Sửa thành id
    if (foundUser && foundUser.email === 'admin@gmail.com') {
      throw new BadRequestException("Cannot delete user with email admin@gmail.com");
    }

    await this.userModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email
        }
      }
    );

    return this.userModel.softDelete({ _id: id });
  }

  // async register(user: RegisterUserDto) {
  //   const { name, email, password, age, address } = user;
  //   // check logic email đã tồn tại chưa
  //   const isExist = await this.userModel.findOne({ email: email });
  //   if (isExist) {
  //     throw new BadRequestException(`Email đã tồn tại ${email}`);
  //   }
  //   const salt = genSaltSync(10);
  //   const hashedPassword = hashSync(user.password, salt);
  //   const newUser = await this.userModel.create({
  //     name, email,
  //     password: hashedPassword,
  //     age,
  //     role: 'USER'
  //   })
  //   return newUser;
  // }
  async register(user: RegisterUserDto) {
    const { name, email, password, age } = user; // Đảm bảo không có thuộc tính không cần thiết

    // Check if email already exists
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email already exists: ${email}`);
    }

    const salt = genSaltSync(10);
    const hashedPassword = hashSync(password, salt);

    const newUser = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      age,
      role: 'USER'
    });

    return newUser;
  }

  // async create(createUser: CreateUserDto) {
  //   // const { name, email, password, company, age, address } = createUser;
  //   const { name, email, password } = createUser;

  //   // Kiểm tra xem email đã tồn tại chưa
  //   const isExist = await this.userModel.findOne({ email: email });
  //   if (isExist) {
  //     throw new BadRequestException(`Email đã tồn tại ${email}`);
  //   }

  //   const salt = genSaltSync(10);
  //   const hashedPassword = hashSync(password, salt);

  //   const newUser = await this.userModel.create({
  //     name,
  //     email,
  //     password: hashedPassword,
  //     // age,
  //     role: 'USER',
  //     // company: {
  //     //   _id: company._id,
  //     //   name: company.name,
  //     // },
  //     // createdBy: {
  //     //   _id: user._id,
  //     //   email: user.email,
  //     // },
  //     createdDate: new Date(), // Thêm createdDate vào đây nếu cần
  //   });

  //   return newUser;
  // }
  async create(createUser: CreateUserDto) {
    const { name, email, password } = createUser;

    // Kiểm tra xem email đã tồn tại chưa
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email already exists: ${email}`);
    }

    // Tìm ObjectId của role 'USER'
    const userRole = await this.roleModel.findOne({ name: 'NORMAL_USER' });
    if (!userRole) {
      throw new BadRequestException('Role not found');
    }

    const salt = genSaltSync(10);
    const hashedPassword = hashSync(password, salt);

    const newUser = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      role: userRole._id, // Gán ObjectId của role
      createdDate: new Date(),
    });

    return newUser;
  }

  async update(userUpdate: UpdateUserDto, user: IUser) {
    // Cập nhật người dùng
    const result = await this.userModel.updateOne(
      { _id: userUpdate._id },
      {
        ...userUpdate,
        updatedBy: {
          _id: user._id,
          email: user.email
        }
      }
    );
  
    // Kiểm tra nếu cập nhật thành công và tìm lại người dùng
    if (result.modifiedCount === 1) {
      const updatedUser = await this.userModel.findById(userUpdate._id)
        .select("-password")
        .populate({ path: "role", select: { name: 1, _id: 1 } })
        .exec();
      
      return updatedUser;
    } else {
      throw new BadRequestException("User update failed");
    }
  }
  

  getHashPassword(password: string): string {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  }
  updateUserToken = async (refreshToken: string, _id: string) => {
    return await this.userModel.updateOne(
      {
        _id: _id
      }, {
      refreshToken
    }
    )

  }


  // findUserByToken = async (refeshToken: string) => {
  //   return await this.userModel.findOne(
  //     { refeshToken }
  //   ).populate({
  //     path:"role",
  //     select:{name:1}
  //   })
  // }
  async findUserByToken(refreshToken: string) {
    return await this.userModel.findOne({ refreshToken })
      .populate({ path: "role", select: { name: 1 } });
  }
  async getInfo(userId: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null; // Hoặc xử lý lỗi phù hợp
    }

    const user = await this.userModel.findById(userId).exec();
    if (user) {
      return {
        ...user.toObject(),
        _id: user._id.toString() // Chuyển ObjectId thành string
      };
    }
    return null;
  }

}
